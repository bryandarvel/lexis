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
  'teste.rota.redacoes.aluno.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professorPrincipal
let professorSecundario
let alunoPrincipal
let alunoColega
let turmaPrincipal
let turmaSecundaria
let temaPrincipal
let temaSecundario
let temaAtrasado
let temaOutraTurma

function criarPrazoFuturo(dias) {
  const prazo = new Date()

  prazo.setDate(prazo.getDate() + dias)

  return prazo
}

function criarPrazoPassado() {
  const prazo = new Date()

  prazo.setDate(prazo.getDate() - 1)

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
          'Avalia a relação entre o repertório e a argumentação.',
      },
      {
        nome: 'Desenvolvimento argumentativo',
        descricao:
          'Avalia o desenvolvimento dos argumentos.',
      },
    ],
  }
}

function salvarRascunho({
  sessao = alunoPrincipal,
  temaId = temaPrincipal.id,
  texto = 'Texto inicial da redação.',
}) {
  return request(app)
    .put(`/api/aluno/temas/${temaId}/redacao`)
    .set(
      'Authorization',
      `Bearer ${sessao.accessToken}`,
    )
    .send({
      texto,
    })
}

function enviarRedacao({
  sessao = alunoPrincipal,
  temaId = temaPrincipal.id,
}) {
  return request(app)
    .post(
      `/api/aluno/temas/${temaId}/redacao/enviar`,
    )
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

  professorPrincipal = await criarUsuarioComSessao({
    nome: 'Professor das Redações',
    papel: 'PROFESSOR',
  })

  professorSecundario = await criarUsuarioComSessao({
    nome: 'Professor de Outra Turma',
    papel: 'PROFESSOR',
  })

  alunoPrincipal = await criarUsuarioComSessao({
    nome: 'Aluno Principal das Redações',
    papel: 'ALUNO',
  })

  alunoColega = await criarUsuarioComSessao({
    nome: 'Aluno Colega das Redações',
    papel: 'ALUNO',
  })

  turmaPrincipal = await criarTurmaParaProfessor({
    nome: 'Turma Principal das Redações',
    professorId: professorPrincipal.usuario.id,
  })

  turmaSecundaria = await criarTurmaParaProfessor({
    nome: 'Turma Secundária das Redações',
    professorId: professorSecundario.usuario.id,
  })

  temaPrincipal = await criarTemaParaProfessor({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    ...criarDadosTema({
      enunciado: 'Tema principal das redações',
      prazoEntrega: criarPrazoFuturo(30),
    }),
  })

  temaSecundario = await criarTemaParaProfessor({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    ...criarDadosTema({
      enunciado: 'Tema secundário das redações',
      prazoEntrega: criarPrazoFuturo(40),
    }),
  })

  temaAtrasado = await criarTemaParaProfessor({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    ...criarDadosTema({
      enunciado: 'Tema com prazo vencido',
      prazoEntrega: criarPrazoFuturo(50),
    }),
  })

  temaOutraTurma = await criarTemaParaProfessor({
    turmaId: turmaSecundaria.id,
    professorId: professorSecundario.usuario.id,
    ...criarDadosTema({
      enunciado: 'Tema de outra turma',
      prazoEntrega: criarPrazoFuturo(60),
    }),
  })
})

beforeEach(async () => {
  const temaIds = [
    temaPrincipal.id,
    temaSecundario.id,
    temaAtrasado.id,
    temaOutraTurma.id,
  ]

  const alunoIds = [
    alunoPrincipal.usuario.id,
    alunoColega.usuario.id,
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
    data: alunoIds.map((alunoId) => ({
      alunoId,
      turmaId: turmaPrincipal.id,
      status: 'ATIVA',
    })),
  })

  const prazoPrincipal = criarPrazoFuturo(30)
  const prazoSecundario = criarPrazoFuturo(40)
  const prazoAtrasado = criarPrazoPassado()
  const prazoOutraTurma = criarPrazoFuturo(60)

  await Promise.all([
    prisma.temaRedacao.update({
      where: {
        id: temaPrincipal.id,
      },
      data: {
        ativo: true,
        arquivadoEm: null,
        criteriosBloqueadosEm: null,
        prazoEntrega: prazoPrincipal,
      },
    }),

    prisma.temaRedacao.update({
      where: {
        id: temaSecundario.id,
      },
      data: {
        ativo: true,
        arquivadoEm: null,
        criteriosBloqueadosEm: null,
        prazoEntrega: prazoSecundario,
      },
    }),

    prisma.temaRedacao.update({
      where: {
        id: temaAtrasado.id,
      },
      data: {
        ativo: true,
        arquivadoEm: null,
        criteriosBloqueadosEm: null,
        prazoEntrega: prazoAtrasado,
      },
    }),

    prisma.temaRedacao.update({
      where: {
        id: temaOutraTurma.id,
      },
      data: {
        ativo: true,
        arquivadoEm: null,
        criteriosBloqueadosEm: null,
        prazoEntrega: prazoOutraTurma,
      },
    }),
  ])

  temaPrincipal.prazoEntrega = prazoPrincipal
  temaSecundario.prazoEntrega = prazoSecundario
  temaAtrasado.prazoEntrega = prazoAtrasado
  temaOutraTurma.prazoEntrega = prazoOutraTurma
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

describe('Rotas de redações do aluno', () => {
  it('deve criar e atualizar um único rascunho', async () => {
    const primeiraResposta = await salvarRascunho({
      texto: '  Primeiro texto do rascunho.  ',
    })
      .expect('Content-Type', /json/)
      .expect(200)

    const primeiroRascunho =
      primeiraResposta.body.data.redacao

    assert.equal(
      primeiroRascunho.texto,
      'Primeiro texto do rascunho.',
    )
    assert.equal(
      primeiroRascunho.status,
      'RASCUNHO',
    )
    assert.equal(
      primeiroRascunho.origemTexto,
      'DIGITADO',
    )

    const segundaResposta = await salvarRascunho({
      texto: 'Texto atualizado do rascunho.',
    }).expect(200)

    const segundoRascunho =
      segundaResposta.body.data.redacao

    assert.equal(
      segundoRascunho.id,
      primeiroRascunho.id,
    )
    assert.equal(
      segundoRascunho.texto,
      'Texto atualizado do rascunho.',
    )

    const quantidade = await prisma.redacao.count({
      where: {
        alunoId: alunoPrincipal.usuario.id,
        temaId: temaPrincipal.id,
      },
    })

    assert.equal(quantidade, 1)
  })

  it('deve rejeitar um texto vazio', async () => {
    const resposta = await salvarRascunho({
      texto: '   ',
    }).expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve rejeitar um identificador inválido', async () => {
    const resposta = await salvarRascunho({
      temaId: 'identificador-invalido',
    }).expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve exigir matrícula ativa', async () => {
    await prisma.matricula.deleteMany({
      where: {
        alunoId: alunoPrincipal.usuario.id,
      },
    })

    const resposta =
      await salvarRascunho({}).expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_TOPIC_NOT_FOUND',
    )
  })

  it('deve ocultar um tema de outra turma', async () => {
    const resposta = await salvarRascunho({
      temaId: temaOutraTurma.id,
    }).expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_TOPIC_NOT_FOUND',
    )
  })

  it('deve bloquear o acesso de professores', async () => {
    const resposta = await salvarRascunho({
      sessao: professorPrincipal,
    }).expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
  })

  it('deve exigir um rascunho antes do envio', async () => {
    const resposta =
      await enviarRedacao({}).expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_DRAFT_NOT_FOUND',
    )
  })

  it('deve enviar e tornar a redação imutável', async () => {
    const respostaRascunho =
      await salvarRascunho({
        texto:
          'Texto definitivo que será enviado pelo aluno.',
      }).expect(200)

    const respostaEnvio =
      await enviarRedacao({}).expect(200)

    const redacao = respostaEnvio.body.data.redacao

    assert.equal(
      redacao.id,
      respostaRascunho.body.data.redacao.id,
    )
    assert.equal(redacao.status, 'ENVIADA')
    assert.equal(redacao.enviadaComAtraso, false)
    assert.ok(redacao.enviadaEm)
    assert.equal(
      redacao.prazoConsideradoEm,
      temaPrincipal.prazoEntrega.toISOString(),
    )

    const temaSalvo =
      await prisma.temaRedacao.findUnique({
        where: {
          id: temaPrincipal.id,
        },
        select: {
          criteriosBloqueadosEm: true,
        },
      })

    assert.ok(temaSalvo.criteriosBloqueadosEm)

    const respostaEdicao =
      await salvarRascunho({
        texto: 'Tentativa de alteração.',
      }).expect(409)

    assert.equal(
      respostaEdicao.body.error.code,
      'ESSAY_ALREADY_SUBMITTED',
    )

    const respostaReenvio =
      await enviarRedacao({}).expect(409)

    assert.equal(
      respostaReenvio.body.error.code,
      'ESSAY_ALREADY_SUBMITTED',
    )
  })

  it('deve aceitar e marcar um envio atrasado', async () => {
    await salvarRascunho({
      temaId: temaAtrasado.id,
      texto: 'Redação enviada depois do prazo.',
    }).expect(200)

    const resposta = await enviarRedacao({
      temaId: temaAtrasado.id,
    }).expect(200)

    const redacao = resposta.body.data.redacao

    assert.equal(redacao.status, 'ENVIADA')
    assert.equal(redacao.enviadaComAtraso, true)
    assert.equal(
      redacao.prazoConsideradoEm,
      temaAtrasado.prazoEntrega.toISOString(),
    )
  })

  it('deve listar somente as redações do próprio aluno', async () => {
    const primeira = await salvarRascunho({
      temaId: temaPrincipal.id,
      texto: 'Primeira redação do aluno.',
    }).expect(200)

    const segunda = await salvarRascunho({
      temaId: temaSecundario.id,
      texto: 'Segunda redação do aluno.',
    }).expect(200)

    await enviarRedacao({
      temaId: temaSecundario.id,
    }).expect(200)

    await salvarRascunho({
      sessao: alunoColega,
      temaId: temaPrincipal.id,
      texto: 'Redação pertencente ao colega.',
    }).expect(200)

    const resposta = await request(app)
      .get('/api/aluno/redacoes')
      .set(
        'Authorization',
        `Bearer ${alunoPrincipal.accessToken}`,
      )
      .expect(200)

    const redacoes = resposta.body.data.redacoes

    assert.equal(redacoes.length, 2)

    assert.deepEqual(
      redacoes.map((redacao) => redacao.id).sort(),
      [
        primeira.body.data.redacao.id,
        segunda.body.data.redacao.id,
      ].sort(),
    )

    assert.equal(
      redacoes.every(
        (redacao) =>
          redacao.alunoId ===
          alunoPrincipal.usuario.id,
      ),
      true,
    )
  })

  it('deve consultar uma redação própria', async () => {
    const respostaRascunho =
      await salvarRascunho({
        texto: 'Redação consultada pelo aluno.',
      }).expect(200)

    const redacaoId =
      respostaRascunho.body.data.redacao.id

    const resposta = await request(app)
      .get(`/api/aluno/redacoes/${redacaoId}`)
      .set(
        'Authorization',
        `Bearer ${alunoPrincipal.accessToken}`,
      )
      .expect(200)

    assert.equal(
      resposta.body.data.redacao.id,
      redacaoId,
    )
    assert.equal(
      resposta.body.data.redacao.tema.id,
      temaPrincipal.id,
    )
  })

  it('deve ocultar a redação de outro aluno', async () => {
    const respostaColega =
      await salvarRascunho({
        sessao: alunoColega,
        texto: 'Redação privada do colega.',
      }).expect(200)

    const redacaoId =
      respostaColega.body.data.redacao.id

    const resposta = await request(app)
      .get(`/api/aluno/redacoes/${redacaoId}`)
      .set(
        'Authorization',
        `Bearer ${alunoPrincipal.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_NOT_FOUND',
    )
  })

  it('deve exigir autenticação', async () => {
    const resposta = await request(app)
      .get('/api/aluno/redacoes')
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })
})