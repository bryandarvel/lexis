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

const prefixoEmail =
  'teste.rota.redacoes.professor.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professorPrincipal
let professorSecundario
let alunoPrincipal
let alunoColega
let alunoOutraTurma
let turmaPrincipal
let turmaSecundaria
let temaPrincipal
let temaSecundario
let temaOutraTurma

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

function criarDadosTema({
  enunciado,
  prazoEntrega,
}) {
  return {
    enunciado,
    descricao:
      'Produza uma redação dissertativo-argumentativa sobre o tema.',
    instrucoes:
      'Utilize repertórios socioculturais pertinentes.',
    prazoEntrega,
    criterios: [
      {
        nome: 'Pertinência do repertório',
        descricao:
          'Avalia a relação entre repertório e argumentação.',
      },
      {
        nome: 'Desenvolvimento argumentativo',
        descricao:
          'Avalia o desenvolvimento dos argumentos.',
      },
    ],
  }
}

async function salvarRascunho({
  sessao,
  temaId,
  texto,
}) {
  const resposta = await request(app)
    .put(`/api/aluno/temas/${temaId}/redacao`)
    .set(
      'Authorization',
      `Bearer ${sessao.accessToken}`,
    )
    .send({
      texto,
    })
    .expect(200)

  return resposta.body.data.redacao
}

async function criarRedacaoEnviada({
  sessao,
  temaId,
  texto,
  status = 'ENVIADA',
}) {
  const rascunho = await salvarRascunho({
    sessao,
    temaId,
    texto,
  })

  await request(app)
    .post(
      `/api/aluno/temas/${temaId}/redacao/enviar`,
    )
    .set(
      'Authorization',
      `Bearer ${sessao.accessToken}`,
    )
    .expect(200)

  if (status === 'AVALIADA') {
    await prisma.redacao.update({
      where: {
        id: rascunho.id,
      },
      data: {
        status: 'AVALIADA',
      },
    })
  }

  return {
    ...rascunho,
    status,
  }
}

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true

  professorPrincipal = await criarUsuarioComSessao({
    nome: 'Professor Principal das Redações',
    papel: 'PROFESSOR',
  })

  professorSecundario = await criarUsuarioComSessao({
    nome: 'Professor Secundário das Redações',
    papel: 'PROFESSOR',
  })

  alunoPrincipal = await criarUsuarioComSessao({
    nome: 'Aluno Principal da Turma',
    papel: 'ALUNO',
  })

  alunoColega = await criarUsuarioComSessao({
    nome: 'Aluno Colega da Turma',
    papel: 'ALUNO',
  })

  alunoOutraTurma = await criarUsuarioComSessao({
    nome: 'Aluno de Outra Turma',
    papel: 'ALUNO',
  })

  turmaPrincipal = await criarTurmaParaProfessor({
    nome: 'Turma das Redações do Professor',
    professorId: professorPrincipal.usuario.id,
  })

  turmaSecundaria = await criarTurmaParaProfessor({
    nome: 'Outra Turma das Redações',
    professorId: professorSecundario.usuario.id,
  })

  temaPrincipal = await criarTemaParaProfessor({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    ...criarDadosTema({
      enunciado: 'Tema principal do professor',
      prazoEntrega: criarPrazoFuturo(30),
    }),
  })

  temaSecundario = await criarTemaParaProfessor({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    ...criarDadosTema({
      enunciado: 'Tema secundário do professor',
      prazoEntrega: criarPrazoFuturo(40),
    }),
  })

  temaOutraTurma = await criarTemaParaProfessor({
    turmaId: turmaSecundaria.id,
    professorId: professorSecundario.usuario.id,
    ...criarDadosTema({
      enunciado: 'Tema pertencente a outro professor',
      prazoEntrega: criarPrazoFuturo(50),
    }),
  })
})

beforeEach(async () => {
  const temaIds = [
    temaPrincipal.id,
    temaSecundario.id,
    temaOutraTurma.id,
  ]

  const alunoIds = [
    alunoPrincipal.usuario.id,
    alunoColega.usuario.id,
    alunoOutraTurma.usuario.id,
  ]

  await prisma.redacao.deleteMany({
    where: {
      temaId: {
        in: temaIds,
      },
    },
  })

  await prisma.matricula.deleteMany({
    where: {
      alunoId: {
        in: alunoIds,
      },
    },
  })

  await prisma.matricula.createMany({
    data: [
      {
        alunoId: alunoPrincipal.usuario.id,
        turmaId: turmaPrincipal.id,
        status: 'ATIVA',
      },
      {
        alunoId: alunoColega.usuario.id,
        turmaId: turmaPrincipal.id,
        status: 'ATIVA',
      },
      {
        alunoId: alunoOutraTurma.usuario.id,
        turmaId: turmaSecundaria.id,
        status: 'ATIVA',
      },
    ],
  })

  await Promise.all([
    prisma.turma.update({
      where: {
        id: turmaPrincipal.id,
      },
      data: {
        ativa: true,
        arquivadaEm: null,
      },
    }),

    prisma.turma.update({
      where: {
        id: turmaSecundaria.id,
      },
      data: {
        ativa: true,
        arquivadaEm: null,
      },
    }),

    prisma.temaRedacao.updateMany({
      where: {
        id: {
          in: temaIds,
        },
      },
      data: {
        ativo: true,
        arquivadoEm: null,
        criteriosBloqueadosEm: null,
      },
    }),
  ])
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
          OR: [
            {
              alunoId: {
                in: usuarioIds,
              },
            },
            {
              tema: {
                turma: {
                  professorId: {
                    in: usuarioIds,
                  },
                },
              },
            },
          ],
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

describe('Rotas de redações do professor', () => {
  it('deve listar somente redações enviadas da própria turma', async () => {
    const enviada = await criarRedacaoEnviada({
      sessao: alunoPrincipal,
      temaId: temaPrincipal.id,
      texto: 'Redação enviada ao professor.',
    })

    const avaliada = await criarRedacaoEnviada({
      sessao: alunoColega,
      temaId: temaSecundario.id,
      texto: 'Redação já avaliada.',
      status: 'AVALIADA',
    })

    const rascunho = await salvarRascunho({
      sessao: alunoColega,
      temaId: temaPrincipal.id,
      texto: 'Rascunho privado do aluno.',
    })

    const outraTurma =
      await criarRedacaoEnviada({
        sessao: alunoOutraTurma,
        temaId: temaOutraTurma.id,
        texto: 'Redação de outra turma.',
      })

    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const redacoes = resposta.body.data.redacoes
    const ids = redacoes
      .map((redacao) => redacao.id)
      .sort()

    assert.equal(redacoes.length, 2)

    assert.deepEqual(
      ids,
      [
        enviada.id,
        avaliada.id,
      ].sort(),
    )

    assert.equal(ids.includes(rascunho.id), false)
    assert.equal(
      ids.includes(outraTurma.id),
      false,
    )
  })

  it('deve filtrar as redações por tema', async () => {
    const principal = await criarRedacaoEnviada({
      sessao: alunoPrincipal,
      temaId: temaPrincipal.id,
      texto: 'Redação do tema principal.',
    })

    await criarRedacaoEnviada({
      sessao: alunoColega,
      temaId: temaSecundario.id,
      texto: 'Redação do tema secundário.',
    })

    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .query({
        temaId: temaPrincipal.id,
      })
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const redacoes = resposta.body.data.redacoes

    assert.equal(redacoes.length, 1)
    assert.equal(redacoes[0].id, principal.id)
  })

  it('deve filtrar as redações por status', async () => {
    await criarRedacaoEnviada({
      sessao: alunoPrincipal,
      temaId: temaPrincipal.id,
      texto: 'Redação ainda não avaliada.',
    })

    const avaliada = await criarRedacaoEnviada({
      sessao: alunoColega,
      temaId: temaSecundario.id,
      texto: 'Redação avaliada.',
      status: 'AVALIADA',
    })

    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .query({
        status: 'AVALIADA',
      })
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const redacoes = resposta.body.data.redacoes

    assert.equal(redacoes.length, 1)
    assert.equal(redacoes[0].id, avaliada.id)
    assert.equal(redacoes[0].status, 'AVALIADA')
  })

  it('deve rejeitar filtros inválidos', async () => {
    const respostaStatus = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .query({
        status: 'RASCUNHO',
      })
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(422)

    assert.equal(
      respostaStatus.body.error.code,
      'VALIDATION_ERROR',
    )

    const respostaCampo = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .query({
        campoInesperado: 'valor',
      })
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(422)

    assert.equal(
      respostaCampo.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve impedir acesso à turma de outro professor', async () => {
    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaSecundaria.id}/redacoes`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'CLASS_NOT_FOUND',
    )
  })

  it('deve bloquear o acesso de alunos', async () => {
    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .set(
        'Authorization',
        `Bearer ${alunoPrincipal.accessToken}`,
      )
      .expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
  })

  it('deve consultar uma redação enviada', async () => {
    const redacao = await criarRedacaoEnviada({
      sessao: alunoPrincipal,
      temaId: temaPrincipal.id,
      texto:
        'Texto completo que será consultado pelo professor.',
    })

    const resposta = await request(app)
      .get(`/api/redacoes/${redacao.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const redacaoConsultada =
      resposta.body.data.redacao

    assert.equal(
      redacaoConsultada.id,
      redacao.id,
    )
    assert.equal(
      redacaoConsultada.texto,
      'Texto completo que será consultado pelo professor.',
    )
    assert.equal(
      redacaoConsultada.aluno.id,
      alunoPrincipal.usuario.id,
    )
    assert.equal(
      redacaoConsultada.tema.id,
      temaPrincipal.id,
    )
    assert.equal(
      redacaoConsultada.tema.criterios.length,
      2,
    )
    assert.equal(
      redacaoConsultada.tema.criterios[0].ordem,
      1,
    )
    assert.equal(
      Object.hasOwn(
        redacaoConsultada.aluno,
        'senhaHash',
      ),
      false,
    )
  })

  it('deve ocultar um rascunho do professor', async () => {
    const rascunho = await salvarRascunho({
      sessao: alunoPrincipal,
      temaId: temaPrincipal.id,
      texto: 'Rascunho privado.',
    })

    const resposta = await request(app)
      .get(`/api/redacoes/${rascunho.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_NOT_FOUND',
    )
  })

  it('deve ocultar redação de outro professor', async () => {
    const redacao = await criarRedacaoEnviada({
      sessao: alunoOutraTurma,
      temaId: temaOutraTurma.id,
      texto: 'Redação pertencente a outro professor.',
    })

    const resposta = await request(app)
      .get(`/api/redacoes/${redacao.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_NOT_FOUND',
    )
  })

  it('deve manter o histórico de uma turma arquivada', async () => {
    const redacao = await criarRedacaoEnviada({
      sessao: alunoPrincipal,
      temaId: temaPrincipal.id,
      texto: 'Redação preservada no histórico.',
    })

    await prisma.turma.update({
      where: {
        id: turmaPrincipal.id,
      },
      data: {
        ativa: false,
        arquivadaEm: new Date(),
      },
    })

    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    assert.equal(
      resposta.body.data.redacoes.length,
      1,
    )
    assert.equal(
      resposta.body.data.redacoes[0].id,
      redacao.id,
    )
  })

  it('deve rejeitar um identificador inválido', async () => {
    const resposta = await request(app)
      .get('/api/redacoes/identificador-invalido')
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve exigir autenticação', async () => {
    const resposta = await request(app)
      .get(
        `/api/turmas/${turmaPrincipal.id}/redacoes`,
      )
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })
})