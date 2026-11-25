import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  after,
  before,
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
  publicarFeedbackParaProfessor,
  salvarFeedbackRascunhoParaProfessor,
} from '../../src/modules/feedbacks/feedbacks.service.js'
import {
  enviarRedacaoParaAluno,
  salvarRascunhoParaAluno,
} from '../../src/modules/redacoes/redacoes.service.js'
import {
  criarTemaParaProfessor,
} from '../../src/modules/temas/temas.service.js'
import { MODELO_COMPETENCIA_DOIS } from '../../src/modules/temas/temas.competencia-dois.js'
import {
  criarTurmaParaProfessor,
} from '../../src/modules/turmas/turmas.service.js'

const prefixoEmail = 'teste.rota.desempenho.aluno.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professor
let aluno
let alunoColega
let alunoSemRedacoes
let redacaoCorrigida
let redacaoRecorrigida
let redacaoRascunho

const primeiraPublicacao = new Date(
  '2026-08-01T12:00:00.000Z',
)
const recorrecao = new Date(
  '2026-08-03T12:00:00.000Z',
)
const ultimaPublicacao = new Date(
  '2026-08-05T12:00:00.000Z',
)

function criarPrazoFuturo(dias) {
  const prazo = new Date()

  prazo.setDate(prazo.getDate() + dias)

  return prazo
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

function criarTema(turmaId, enunciado) {
  return criarTemaParaProfessor({
    turmaId,
    professorId: professor.usuario.id,
    enunciado,
    descricao:
      'Produza uma redação dissertativo-argumentativa sobre o tema.',
    instrucoes: null,
    prazoEntrega: criarPrazoFuturo(30),
    criterios: MODELO_COMPETENCIA_DOIS.criterios.map((criterio) => ({ ...criterio })),
  })
}

async function enviarRedacao(alunoId, temaId) {
  await salvarRascunhoParaAluno({
    temaId,
    alunoId,
    texto: 'Texto fictício de uma redação de teste.',
  })

  return enviarRedacaoParaAluno({
    temaId,
    alunoId,
  })
}

async function publicarCorrecao(
  redacaoId,
  competencias,
  publicadoEm,
) {
  await salvarFeedbackRascunhoParaProfessor({
    redacaoId,
    professorId: professor.usuario.id,
    ...competencias,
    comentarioGeral:
      'Comentário fictício da correção de teste.',
    criterios: [],
  })

  return publicarFeedbackParaProfessor(
    {
      redacaoId,
      professorId: professor.usuario.id,
    },
    {
      agora: () => publicadoEm,
    },
  )
}

function consultar(caminho, sessao) {
  return request(app)
    .get(caminho)
    .set(
      'Authorization',
      `Bearer ${sessao.accessToken}`,
    )
}

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true

  professor = await criarUsuarioComSessao({
    nome: 'Professor do Desempenho',
    papel: 'PROFESSOR',
  })
  aluno = await criarUsuarioComSessao({
    nome: 'Aluno do Desempenho',
    papel: 'ALUNO',
  })
  alunoColega = await criarUsuarioComSessao({
    nome: 'Colega do Desempenho',
    papel: 'ALUNO',
  })
  alunoSemRedacoes = await criarUsuarioComSessao({
    nome: 'Aluno sem Redações',
    papel: 'ALUNO',
  })

  const turma = await criarTurmaParaProfessor({
    nome: 'Turma do Desempenho',
    professorId: professor.usuario.id,
  })

  await prisma.matricula.createMany({
    data: [
      aluno,
      alunoColega,
      alunoSemRedacoes,
    ].map((sessao) => ({
      alunoId: sessao.usuario.id,
      turmaId: turma.id,
      status: 'ATIVA',
    })),
  })

  const temaRecorrigido = await criarTema(
    turma.id,
    'Tema recorrigido do desempenho',
  )
  const temaCorrigido = await criarTema(
    turma.id,
    'Tema corrigido do desempenho',
  )
  const temaRascunho = await criarTema(
    turma.id,
    'Tema em rascunho do desempenho',
  )

  redacaoRecorrigida = await enviarRedacao(
    aluno.usuario.id,
    temaRecorrigido.id,
  )
  redacaoCorrigida = await enviarRedacao(
    aluno.usuario.id,
    temaCorrigido.id,
  )
  redacaoRascunho = await salvarRascunhoParaAluno({
    temaId: temaRascunho.id,
    alunoId: aluno.usuario.id,
    texto: 'Rascunho fictício ainda não entregue.',
  })

  await publicarCorrecao(
    redacaoRecorrigida.id,
    {
      competencia1: 160,
      competencia2: 160,
      competencia3: 160,
      competencia4: 160,
      competencia5: 160,
    },
    primeiraPublicacao,
  )
  await publicarCorrecao(
    redacaoRecorrigida.id,
    {
      competencia1: 200,
      competencia2: 200,
      competencia3: 160,
      competencia4: 160,
      competencia5: 120,
    },
    recorrecao,
  )
  await publicarCorrecao(
    redacaoCorrigida.id,
    {
      competencia1: 200,
      competencia2: 120,
      competencia3: 200,
      competencia4: 200,
      competencia5: 200,
    },
    ultimaPublicacao,
  )

  const redacaoColega = await enviarRedacao(
    alunoColega.usuario.id,
    temaCorrigido.id,
  )

  await publicarCorrecao(
    redacaoColega.id,
    {
      competencia1: 200,
      competencia2: 200,
      competencia3: 200,
      competencia4: 200,
      competencia5: 200,
    },
    ultimaPublicacao,
  )
})

after(async () => {
  if (bancoDeTesteConfirmado) {
    const usuarios = await prisma.usuario.findMany({
      where: {
        email: {
          startsWith: prefixoEmail,
        },
      },
      select: {
        id: true,
      },
    })

    const usuarioIds = usuarios.map(
      (usuario) => usuario.id,
    )

    if (usuarioIds.length > 0) {
      const filtroRedacoes = {
        alunoId: {
          in: usuarioIds,
        },
      }

      await prisma.notificacao.deleteMany({
        where: {
          usuarioId: {
            in: usuarioIds,
          },
        },
      })
      await prisma.feedbackVersao.deleteMany({
        where: {
          feedback: {
            redacao: filtroRedacoes,
          },
        },
      })
      await prisma.feedback.deleteMany({
        where: {
          redacao: filtroRedacoes,
        },
      })
      await prisma.redacao.deleteMany({
        where: filtroRedacoes,
      })
      await prisma.temaRedacao.deleteMany({
        where: {
          turma: {
            professorId: {
              in: usuarioIds,
            },
          },
        },
      })
      await prisma.matricula.deleteMany({
        where: {
          alunoId: {
            in: usuarioIds,
          },
        },
      })
      await prisma.turma.deleteMany({
        where: {
          professorId: {
            in: usuarioIds,
          },
        },
      })
      await prisma.usuario.deleteMany({
        where: {
          id: {
            in: usuarioIds,
          },
        },
      })
    }
  }

  await prisma.$disconnect()
})

describe('Desempenho do aluno com banco de dados', () => {
  it('deve considerar somente as versões publicadas do próprio aluno', async () => {
    const resposta = await consultar(
      '/api/aluno/desempenho',
      aluno,
    ).expect(200)

    assert.deepEqual(resposta.body.data.desempenho, {
      mediaGeral: 880,
      ultimaNota: 920,
      mediaCompetencia2: 160,
      totalEnviadas: 2,
      totalCorrigidas: 2,
    })
  })

  it('deve retornar nulos para um aluno sem correção publicada', async () => {
    const resposta = await consultar(
      '/api/aluno/desempenho',
      alunoSemRedacoes,
    ).expect(200)

    assert.deepEqual(resposta.body.data.desempenho, {
      mediaGeral: null,
      ultimaNota: null,
      mediaCompetencia2: null,
      totalEnviadas: 0,
      totalCorrigidas: 0,
    })
  })

  it('deve incluir a última publicação de cada redação na listagem', async () => {
    const resposta = await consultar(
      '/api/aluno/redacoes',
      aluno,
    ).expect(200)

    const porId = new Map(
      resposta.body.data.redacoes.map((redacao) => [
        redacao.id,
        redacao,
      ]),
    )

    assert.equal(porId.size, 3)

    assert.equal(
      porId.get(redacaoRecorrigida.id).notaPublicada,
      840,
    )
    assert.equal(
      porId.get(redacaoRecorrigida.id).publicadoEm,
      recorrecao.toISOString(),
    )
    assert.equal(
      porId.get(redacaoCorrigida.id).notaPublicada,
      920,
    )
    assert.equal(
      porId.get(redacaoCorrigida.id).publicadoEm,
      ultimaPublicacao.toISOString(),
    )
    assert.equal(
      porId.get(redacaoRascunho.id).notaPublicada,
      null,
    )
    assert.equal(
      porId.get(redacaoRascunho.id).publicadoEm,
      null,
    )
    assert.equal(
      resposta.body.data.redacoes.some(
        (redacao) => 'feedback' in redacao,
      ),
      false,
    )
  })
})
