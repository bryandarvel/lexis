import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  after,
  before,
  beforeEach,
  describe,
  it,
} from 'node:test'

import request from 'supertest'

import { app } from '../../src/app.js'
import { prisma } from '../../src/config/prisma.js'
import {
  autenticarUsuario,
  cadastrarUsuario,
} from '../../src/modules/auth/auth.service.js'
import {
  criarTemaParaProfessor,
} from '../../src/modules/temas/temas.service.js'
import {
  criarTurmaParaProfessor,
} from '../../src/modules/turmas/turmas.service.js'

const prefixoEmail = 'teste.rota.ocr.'
const senha = 'SenhaSegura123'
const fetchOriginal = globalThis.fetch

let bancoDeTesteConfirmado = false
let chamadasOcr = 0
let professor
let alunoPrincipal
let alunoLimite
let turma
let tema

function criarPrazoFuturo() {
  const prazo = new Date()

  prazo.setDate(prazo.getDate() + 30)

  return prazo
}

function criarImagemJpeg() {
  return Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
  ])
}

async function criarUsuarioComSessao({
  nome,
  papel,
}) {
  const email =
    `${prefixoEmail}${randomUUID()}@exemplo.com`

  const usuario = await cadastrarUsuario({
    nome,
    email,
    senha,
    papel,
  })

  const sessao = await autenticarUsuario({
    email,
    senha,
  })

  return {
    usuario,
    accessToken: sessao.accessToken,
  }
}

function enviarImagemOcr({
  sessao = alunoPrincipal,
  buffer = criarImagemJpeg(),
  nomeArquivo = 'redacao.jpg',
  contentType = 'image/jpeg',
} = {}) {
  return request(app)
    .post(
      `/api/aluno/temas/${tema.id}/redacao/ocr`,
    )
    .set(
      'Authorization',
      `Bearer ${sessao.accessToken}`,
    )
    .attach(
      'imagem',
      buffer,
      {
        filename: nomeArquivo,
        contentType,
      },
    )
}

function salvarTextoRevisado(texto) {
  return request(app)
    .put(
      `/api/aluno/temas/${tema.id}/redacao`,
    )
    .set(
      'Authorization',
      `Bearer ${alunoPrincipal.accessToken}`,
    )
    .send({
      texto,
    })
}

function confirmarTextoOcr(texto) {
  return request(app)
    .put(
      `/api/aluno/temas/${tema.id}/redacao/ocr/revisao`,
    )
    .set(
      'Authorization',
      `Bearer ${alunoPrincipal.accessToken}`,
    )
    .send({
      texto,
    })
}

function enviarRedacao() {
  return request(app)
    .post(
      `/api/aluno/temas/${tema.id}/redacao/enviar`,
    )
    .set(
      'Authorization',
      `Bearer ${alunoPrincipal.accessToken}`,
    )
}

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true

  professor = await criarUsuarioComSessao({
    nome: 'Professor do OCR',
    papel: 'PROFESSOR',
  })

  alunoPrincipal = await criarUsuarioComSessao({
    nome: 'Aluno Principal do OCR',
    papel: 'ALUNO',
  })

  alunoLimite = await criarUsuarioComSessao({
    nome: 'Aluno do Limite OCR',
    papel: 'ALUNO',
  })

  turma = await criarTurmaParaProfessor({
    nome: 'Turma de Teste OCR',
    professorId: professor.usuario.id,
  })

  await prisma.matricula.createMany({
    data: [
      {
        alunoId: alunoPrincipal.usuario.id,
        turmaId: turma.id,
        status: 'ATIVA',
      },
      {
        alunoId: alunoLimite.usuario.id,
        turmaId: turma.id,
        status: 'ATIVA',
      },
    ],
  })

  tema = await criarTemaParaProfessor({
    turmaId: turma.id,
    professorId: professor.usuario.id,
    enunciado: 'Tema para transcrição OCR',
    descricao:
      'Produza uma redação dissertativo-argumentativa.',
    instrucoes:
      'Revise o texto extraído antes do envio.',
    prazoEntrega: criarPrazoFuturo(),
    criterios: [
      {
        nome: 'Argumentação',
        descricao:
          'Avalia o desenvolvimento argumentativo.',
      },
    ],
  })

  globalThis.fetch = async () => {
    chamadasOcr += 1

    return {
      ok: true,
      status: 200,
      json: async () => ({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ProcessingTimeInMilliseconds: '100',
        ParsedResults: [
          {
            ParsedText:
              'Texto manuscrito extraído pelo OCR.',
          },
        ],
      }),
    }
  }
})

beforeEach(async () => {
  await prisma.redacao.deleteMany({
    where: {
      temaId: tema.id,
    },
  })
})

after(async () => {
  globalThis.fetch = fetchOriginal

  if (bancoDeTesteConfirmado) {
    await prisma.redacao.deleteMany({
      where: {
        temaId: tema?.id,
      },
    })

    await prisma.temaRedacao.deleteMany({
      where: {
        id: tema?.id,
      },
    })

    await prisma.matricula.deleteMany({
      where: {
        turmaId: turma?.id,
      },
    })

    await prisma.turma.deleteMany({
      where: {
        id: turma?.id,
      },
    })

    await prisma.usuario.deleteMany({
      where: {
        email: {
          startsWith: prefixoEmail,
        },
      },
    })
  }

  await prisma.$disconnect()
})

describe('POST /api/aluno/temas/:temaId/redacao/ocr', () => {
  it('deve extrair o texto sem substituir o rascunho atual', async () => {
    await salvarTextoRevisado(
      'Texto digitado que deve permanecer salvo.',
    ).expect(200)

    const resposta = await enviarImagemOcr()
      .expect('Content-Type', /json/)
      .expect(200)

    assert.equal(
      resposta.body.data.textoExtraido,
      'Texto manuscrito extraído pelo OCR.',
    )
    assert.equal(
      resposta.body.data.revisaoObrigatoria,
      true,
    )

    const redacaoSalva =
      await prisma.redacao.findFirst({
        where: {
          temaId: tema.id,
          alunoId: alunoPrincipal.usuario.id,
        },
      })

    assert.equal(
      redacaoSalva.texto,
      'Texto digitado que deve permanecer salvo.',
    )
    assert.equal(redacaoSalva.origemTexto, 'DIGITADO')
    assert.equal(redacaoSalva.ocrRevisadoEm, null)
  })

  it('deve exigir revisão antes do envio definitivo', async () => {
    await enviarImagemOcr().expect(200)

    const respostaSemRevisao =
      await enviarRedacao().expect(404)

    assert.equal(
      respostaSemRevisao.body.error.code,
      'ESSAY_DRAFT_NOT_FOUND',
    )

    const respostaRevisao =
      await confirmarTextoOcr(
        'Texto extraído, revisado e confirmado pelo aluno.',
      ).expect(200)

    assert.equal(
      respostaRevisao.body.data.redacao.origemTexto,
      'OCR',
    )
    assert.ok(
      respostaRevisao.body.data.redacao.ocrRevisadoEm,
    )

    const respostaEnvio =
      await enviarRedacao().expect(200)

    assert.equal(
      respostaEnvio.body.data.redacao.status,
      'ENVIADA',
    )
  })

  it('deve rejeitar um formato não permitido sem chamar o OCR', async () => {
    const chamadasAnteriores = chamadasOcr

    const resposta = await enviarImagemOcr({
      buffer: Buffer.from('arquivo de texto'),
      nomeArquivo: 'redacao.txt',
      contentType: 'text/plain',
    }).expect(415)

    assert.equal(
      resposta.body.error.code,
      'OCR_IMAGE_TYPE_UNSUPPORTED',
    )
    assert.equal(chamadasOcr, chamadasAnteriores)
  })

  it('deve bloquear o acesso de professores', async () => {
    const chamadasAnteriores = chamadasOcr

    const resposta = await enviarImagemOcr({
      sessao: professor,
    }).expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
    assert.equal(chamadasOcr, chamadasAnteriores)
  })

  it('não deve chamar o OCR depois do envio da redação', async () => {
    await salvarTextoRevisado(
      'Redação digitada e enviada definitivamente.',
    ).expect(200)

    await enviarRedacao().expect(200)

    const chamadasAnteriores = chamadasOcr

    const resposta =
      await enviarImagemOcr().expect(409)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_ALREADY_SUBMITTED',
    )
    assert.equal(chamadasOcr, chamadasAnteriores)
  })

  it('deve limitar cada aluno a cinco solicitações por janela', async () => {
    for (let tentativa = 1; tentativa <= 5; tentativa += 1) {
      await enviarImagemOcr({
        sessao: alunoLimite,
      }).expect(200)
    }

    const resposta = await enviarImagemOcr({
      sessao: alunoLimite,
    }).expect(429)

    assert.equal(
      resposta.body.error.code,
      'OCR_RATE_LIMIT_EXCEEDED',
    )
  })
})
