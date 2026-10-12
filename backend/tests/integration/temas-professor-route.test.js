import assert from 'node:assert/strict'
import { obterModeloCompetenciaDois } from '../../src/modules/temas/temas.competencia-dois.js'
import { criarTemaComCriterios } from '../../src/modules/temas/temas.repository.js'
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
  criarTurmaParaProfessor,
} from '../../src/modules/turmas/turmas.service.js'

const prefixoEmail = 'teste.rota.temas.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professorPrincipal
let professorSecundario
let aluno
let turmaPrincipal
let turmaSecundaria

function criarPrazoFuturo(dias = 30) {
  const prazo = new Date()

  prazo.setDate(prazo.getDate() + dias)

  return prazo.toISOString()
}

function criarDadosTema(sobrescritas = {}) {
  return {
    enunciado:
      'Os desafios da inclusão digital no Brasil',
    descricao:
      'Produza um texto dissertativo-argumentativo sobre o tema proposto.',
    instrucoes:
      'Utilize repertórios socioculturais pertinentes.',
    prazoEntrega: criarPrazoFuturo(),
    criterios: obterModeloCompetenciaDois().criterios,
    ...sobrescritas,
  }
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

async function criarTemaPelaApi({
  accessToken,
  turmaId,
  dados = criarDadosTema(),
}) {
  const resposta = await request(app)
    .post(`/api/turmas/${turmaId}/temas`)
    .set(
      'Authorization',
      `Bearer ${accessToken}`,
    )
    .send(dados)
    .expect('Content-Type', /json/)
    .expect(201)

  return resposta.body.data.tema
}

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true

  professorPrincipal = await criarUsuarioComSessao({
    nome: 'Professor Principal dos Temas',
    papel: 'PROFESSOR',
  })

  professorSecundario = await criarUsuarioComSessao({
    nome: 'Professor Secundário dos Temas',
    papel: 'PROFESSOR',
  })

  aluno = await criarUsuarioComSessao({
    nome: 'Aluno dos Temas',
    papel: 'ALUNO',
  })

  turmaPrincipal = await criarTurmaParaProfessor({
    nome: 'Turma Principal dos Temas',
    professorId: professorPrincipal.usuario.id,
  })

  turmaSecundaria = await criarTurmaParaProfessor({
    nome: 'Turma Secundária dos Temas',
    professorId: professorSecundario.usuario.id,
  })
})

beforeEach(async () => {
  const professorIds = [
    professorPrincipal.usuario.id,
    professorSecundario.usuario.id,
  ]

  await prisma.redacao.deleteMany({
    where: {
      tema: {
        turma: {
          professorId: {
            in: professorIds,
          },
        },
      },
    },
  })

  await prisma.temaRedacao.deleteMany({
    where: {
      turma: {
        professorId: {
          in: professorIds,
        },
      },
    },
  })
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
      await prisma.redacao.deleteMany({
        where: {
          tema: {
            turma: {
              professorId: {
                in: usuarioIds,
              },
            },
          },
        },
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
          OR: [
            {
              alunoId: {
                in: usuarioIds,
              },
            },
            {
              turma: {
                professorId: {
                  in: usuarioIds,
                },
              },
            },
          ],
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

describe('Contrato fixo dos critérios', () => {
  it('impede contornar criação e edição pela API sem alterar a proposta', async () => {
    const tema = await criarTemaPelaApi({ accessToken: professorPrincipal.accessToken, turmaId: turmaPrincipal.id })
    const base = obterModeloCompetenciaDois().criterios
    const alterados = structuredClone(base)
    alterados[0].descricao = 'Uma descrição diferente da base obrigatória.'
    const invalidos = [base.slice(1), alterados, [...base].reverse(), [...base, ...['Extra A', 'Extra B', 'Extra C'].map(nome => ({ nome, descricao: 'Descrição personalizada.' }))], [...base, { nome: 'legitimacao', descricao: 'Duplicação da base.' }]]
    for (const criterios of invalidos) {
      await request(app).post(`/api/turmas/${turmaPrincipal.id}/temas`)
        .set('Authorization', `Bearer ${professorPrincipal.accessToken}`)
        .send(criarDadosTema({ criterios })).expect(422)
      await request(app).put(`/api/temas/${tema.id}/criterios`)
        .set('Authorization', `Bearer ${professorPrincipal.accessToken}`)
        .send({ criterios }).expect(422)
    }
    const depois = await prisma.criterioAvaliacao.findMany({ where: { temaId: tema.id }, orderBy: { ordem: 'asc' } })
    assert.deepEqual(depois.map(c => c.id), tema.criterios.map(c => c.id))
    assert.equal(await prisma.temaRedacao.count({ where: { turmaId: turmaPrincipal.id } }), 1)
    await assert.rejects(async () => criarTemaComCriterios({ turmaId: turmaPrincipal.id, ...criarDadosTema({ criterios: [] }) }), { code: 'VALIDATION_ERROR' })
  })

  it('preserva proposta legada sem conversão implícita e mantém sua consulta', async () => {
    const tema = await criarTemaPelaApi({ accessToken: professorPrincipal.accessToken, turmaId: turmaPrincipal.id })
    await prisma.criterioAvaliacao.update({ where: { id: tema.criterios[0].id }, data: { descricao: 'Descrição histórica anterior à base fixa.' } })
    const antes = await prisma.criterioAvaliacao.findMany({ where: { temaId: tema.id }, orderBy: { ordem: 'asc' } })
    const resposta = await request(app).put(`/api/temas/${tema.id}/criterios`)
      .set('Authorization', `Bearer ${professorPrincipal.accessToken}`)
      .send({ criterios: obterModeloCompetenciaDois().criterios }).expect(409)
    assert.equal(resposta.body.error.code, 'LEGACY_CRITERIA_REVIEW_REQUIRED')
    const consulta = await request(app).get(`/api/temas/${tema.id}`)
      .set('Authorization', `Bearer ${professorPrincipal.accessToken}`).expect(200)
    assert.equal(consulta.body.data.tema.criterios[0].descricao, antes[0].descricao)
    assert.deepEqual(await prisma.criterioAvaliacao.findMany({ where: { temaId: tema.id }, orderBy: { ordem: 'asc' } }), antes)
  })
})

describe('Rotas de temas do professor', () => {
  it('deve criar um tema com critérios ordenados', async () => {
    const tema = await criarTemaPelaApi({
      accessToken:
        professorPrincipal.accessToken,
      turmaId: turmaPrincipal.id,
      dados: criarDadosTema({
        enunciado:
          '  Inclusão   digital no Brasil  ',
        instrucoes: '',
      }),
    })

    assert.equal(
      tema.enunciado,
      'Inclusão digital no Brasil',
    )
    assert.equal(tema.instrucoes, null)
    assert.equal(tema.ativo, true)
    assert.equal(tema.quantidadeRedacoes, 0)
    assert.equal(tema.criteriosBloqueados, false)
    assert.equal(tema.criterios.length, 3)
    assert.equal(tema.criterios[0].ordem, 1)
    assert.equal(tema.criterios[1].ordem, 2)
    assert.equal(
      Object.hasOwn(tema, '_count'),
      false,
    )
  })

  it('deve rejeitar um prazo no passado', async () => {
    const resposta = await request(app)
      .post(
        `/api/turmas/${turmaPrincipal.id}/temas`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send(
        criarDadosTema({
          prazoEntrega:
            '2020-01-01T23:59:00.000Z',
        }),
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'DEADLINE_MUST_BE_IN_FUTURE',
    )
  })

  it('deve rejeitar critérios com nomes repetidos', async () => {
    const resposta = await request(app)
      .post(
        `/api/turmas/${turmaPrincipal.id}/temas`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send(
        criarDadosTema({
          criterios: [
            ...obterModeloCompetenciaDois().criterios,
            {
              nome: 'Repertório',
              descricao:
                'Primeiro critério de avaliação.',
            },
            {
              nome: 'repertório',
              descricao:
                'Segundo critério de avaliação.',
            },
          ],
        }),
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve bloquear a criação para alunos', async () => {
    const resposta = await request(app)
      .post(
        `/api/turmas/${turmaPrincipal.id}/temas`,
      )
      .set(
        'Authorization',
        `Bearer ${aluno.accessToken}`,
      )
      .send(criarDadosTema())
      .expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
  })

  it('deve impedir criação em turma de outro professor', async () => {
    const resposta = await request(app)
      .post(
        `/api/turmas/${turmaSecundaria.id}/temas`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send(criarDadosTema())
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'CLASS_NOT_FOUND',
    )
  })

  it('deve listar somente os temas da turma solicitada', async () => {
    const temaPrincipal = await criarTemaPelaApi({
      accessToken:
        professorPrincipal.accessToken,
      turmaId: turmaPrincipal.id,
    })

    await criarTemaPelaApi({
      accessToken:
        professorSecundario.accessToken,
      turmaId: turmaSecundaria.id,
    })

    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/temas`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const temas = resposta.body.data.temas

    assert.equal(temas.length, 1)
    assert.equal(temas[0].id, temaPrincipal.id)
  })

  it('deve ocultar um tema de outro professor', async () => {
    const tema = await criarTemaPelaApi({
      accessToken:
        professorSecundario.accessToken,
      turmaId: turmaSecundaria.id,
    })

    const resposta = await request(app)
      .get(`/api/temas/${tema.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_TOPIC_NOT_FOUND',
    )
  })

  it('deve atualizar o conteúdo antes do bloqueio', async () => {
    const tema = await criarTemaPelaApi({
      accessToken:
        professorPrincipal.accessToken,
      turmaId: turmaPrincipal.id,
    })

    const resposta = await request(app)
      .patch(`/api/temas/${tema.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        enunciado:
          '  Novo   enunciado para o tema  ',
        instrucoes: null,
      })
      .expect(200)

    assert.equal(
      resposta.body.data.tema.enunciado,
      'Novo enunciado para o tema',
    )
    assert.equal(
      resposta.body.data.tema.instrucoes,
      null,
    )
  })

  it('deve rejeitar uma atualização vazia', async () => {
    const tema = await criarTemaPelaApi({
      accessToken:
        professorPrincipal.accessToken,
      turmaId: turmaPrincipal.id,
    })

    const resposta = await request(app)
      .patch(`/api/temas/${tema.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({})
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve acrescentar personalizados preservando a base fixa', async () => {
    const tema = await criarTemaPelaApi({
      accessToken:
        professorPrincipal.accessToken,
      turmaId: turmaPrincipal.id,
    })

    const resposta = await request(app)
      .put(`/api/temas/${tema.id}/criterios`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        criterios: [
          ...obterModeloCompetenciaDois().criterios,
          {
            nome: 'Critério A',
            descricao:
              'Descrição completa do critério A.',
          },
          {
            nome: 'Critério B',
            descricao:
              'Descrição completa do critério B.',
          },
        ],
      })
      .expect(200)

    const criterios =
      resposta.body.data.tema.criterios

    assert.equal(criterios.length, 5)
    assert.equal(criterios[0].nome, 'Legitimação')
    assert.equal(criterios[0].ordem, 1)
    assert.equal(criterios[4].nome, 'Critério B')
    assert.equal(criterios[4].ordem, 5)
  })

  it('deve bloquear conteúdo e critérios, mas permitir o prazo', async () => {
    const tema = await criarTemaPelaApi({
      accessToken:
        professorPrincipal.accessToken,
      turmaId: turmaPrincipal.id,
    })

    await prisma.temaRedacao.update({
      where: {
        id: tema.id,
      },
      data: {
        criteriosBloqueadosEm: new Date(),
      },
    })

    const respostaConteudo = await request(app)
      .patch(`/api/temas/${tema.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        enunciado:
          'Alteração que deve ser bloqueada',
      })
      .expect(409)

    assert.equal(
      respostaConteudo.body.error.code,
      'ESSAY_TOPIC_CONTENT_LOCKED',
    )

    const respostaCriterios = await request(app)
      .put(`/api/temas/${tema.id}/criterios`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        criterios: [
          ...obterModeloCompetenciaDois().criterios,
          {
            nome: 'Novo critério',
            descricao:
              'Descrição do critério bloqueado.',
          },
        ],
      })
      .expect(409)

    assert.equal(
      respostaCriterios.body.error.code,
      'EVALUATION_CRITERIA_LOCKED',
    )

    const novoPrazo = criarPrazoFuturo(60)

    const respostaPrazo = await request(app)
      .patch(`/api/temas/${tema.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        prazoEntrega: novoPrazo,
      })
      .expect(200)

    assert.equal(
      respostaPrazo.body.data.tema.prazoEntrega,
      novoPrazo,
    )
  })

  it('deve arquivar e manter o tema na listagem histórica', async () => {
    const tema = await criarTemaPelaApi({
      accessToken:
        professorPrincipal.accessToken,
      turmaId: turmaPrincipal.id,
    })

    const respostaArquivar = await request(app)
      .post(`/api/temas/${tema.id}/arquivar`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    assert.equal(
      respostaArquivar.body.data.tema.ativo,
      false,
    )
    assert.ok(
      respostaArquivar.body.data.tema.arquivadoEm,
    )

    const respostaAtualizar = await request(app)
      .patch(`/api/temas/${tema.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        prazoEntrega: criarPrazoFuturo(90),
      })
      .expect(409)

    assert.equal(
      respostaAtualizar.body.error.code,
      'ESSAY_TOPIC_ARCHIVED',
    )

    const respostaListar = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/temas`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const temaArquivado =
      respostaListar.body.data.temas.find(
        (item) => item.id === tema.id,
      )

    assert.ok(temaArquivado)
    assert.equal(temaArquivado.ativo, false)
  })
})
