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

const prefixoEmail = 'teste.rota.temas.aluno.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professorPrincipal
let professorSecundario
let alunoMatriculado
let alunoSemMatricula
let turmaPrincipal
let turmaSecundaria
let temaMaisProximo
let temaMaisDistante
let temaArquivado
let temaOutraTurma

function criarPrazoFuturo(dias) {
  const prazo = new Date()

  prazo.setDate(prazo.getDate() + dias)

  return prazo
}

function criarDadosTema({
  enunciado,
  diasAtePrazo,
}) {
  return {
    enunciado,
    descricao:
      'Produza uma redação dissertativo-argumentativa sobre o tema.',
    instrucoes:
      'Utilize repertórios socioculturais pertinentes.',
    prazoEntrega: criarPrazoFuturo(diasAtePrazo),
    criterios: [
      {
        nome: 'Pertinência do repertório',
        descricao:
          'Avalia a relação entre o repertório e a argumentação.',
      },
      {
        nome: 'Desenvolvimento argumentativo',
        descricao:
          'Avalia o desenvolvimento dos argumentos apresentados.',
      },
    ],
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

async function criarTema({
  turmaId,
  professorId,
  enunciado,
  diasAtePrazo,
}) {
  return criarTemaParaProfessor({
    turmaId,
    professorId,
    ...criarDadosTema({
      enunciado,
      diasAtePrazo,
    }),
  })
}

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true

  professorPrincipal = await criarUsuarioComSessao({
    nome: 'Professor Principal dos Temas do Aluno',
    papel: 'PROFESSOR',
  })

  professorSecundario = await criarUsuarioComSessao({
    nome: 'Professor Secundário dos Temas do Aluno',
    papel: 'PROFESSOR',
  })

  alunoMatriculado = await criarUsuarioComSessao({
    nome: 'Aluno Matriculado nos Temas',
    papel: 'ALUNO',
  })

  alunoSemMatricula = await criarUsuarioComSessao({
    nome: 'Aluno sem Matrícula nos Temas',
    papel: 'ALUNO',
  })

  turmaPrincipal = await criarTurmaParaProfessor({
    nome: 'Turma Principal dos Temas do Aluno',
    professorId: professorPrincipal.usuario.id,
  })

  turmaSecundaria = await criarTurmaParaProfessor({
    nome: 'Turma Secundária dos Temas do Aluno',
    professorId: professorSecundario.usuario.id,
  })
})

beforeEach(async () => {
  const professorIds = [
    professorPrincipal.usuario.id,
    professorSecundario.usuario.id,
  ]

  const alunoIds = [
    alunoMatriculado.usuario.id,
    alunoSemMatricula.usuario.id,
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

  await prisma.matricula.deleteMany({
    where: {
      OR: [
        {
          alunoId: {
            in: alunoIds,
          },
        },
        {
          turma: {
            professorId: {
              in: professorIds,
            },
          },
        },
      ],
    },
  })

  await prisma.matricula.create({
    data: {
      alunoId: alunoMatriculado.usuario.id,
      turmaId: turmaPrincipal.id,
    },
  })

  temaMaisProximo = await criarTema({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    enunciado: 'Tema com prazo mais próximo',
    diasAtePrazo: 10,
  })

  temaMaisDistante = await criarTema({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    enunciado: 'Tema com prazo mais distante',
    diasAtePrazo: 20,
  })

  temaArquivado = await criarTema({
    turmaId: turmaPrincipal.id,
    professorId: professorPrincipal.usuario.id,
    enunciado: 'Tema arquivado',
    diasAtePrazo: 30,
  })

  await prisma.temaRedacao.update({
    where: {
      id: temaArquivado.id,
    },
    data: {
      ativo: false,
      arquivadoEm: new Date(),
    },
  })

  temaOutraTurma = await criarTema({
    turmaId: turmaSecundaria.id,
    professorId: professorSecundario.usuario.id,
    enunciado: 'Tema de outra turma',
    diasAtePrazo: 15,
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

describe('Rotas de temas do aluno', () => {
  it('deve listar somente os temas ativos da turma atual', async () => {
    const resposta = await request(app)
      .get('/api/aluno/temas')
      .set(
        'Authorization',
        `Bearer ${alunoMatriculado.accessToken}`,
      )
      .expect('Content-Type', /json/)
      .expect(200)

    const temas = resposta.body.data.temas

    assert.equal(temas.length, 2)
    assert.equal(temas[0].id, temaMaisProximo.id)
    assert.equal(temas[1].id, temaMaisDistante.id)

    assert.equal(
      temas.some(
        (tema) => tema.id === temaArquivado.id,
      ),
      false,
    )

    assert.equal(
      temas.some(
        (tema) => tema.id === temaOutraTurma.id,
      ),
      false,
    )
  })

  it('deve consultar um tema ativo da turma atual', async () => {
    const resposta = await request(app)
      .get(`/api/aluno/temas/${temaMaisProximo.id}`)
      .set(
        'Authorization',
        `Bearer ${alunoMatriculado.accessToken}`,
      )
      .expect(200)

    const tema = resposta.body.data.tema

    assert.equal(tema.id, temaMaisProximo.id)
    assert.equal(tema.turma.id, turmaPrincipal.id)
    assert.equal(
      tema.turma.professor.id,
      professorPrincipal.usuario.id,
    )
    assert.equal(tema.criterios.length, 2)
    assert.equal(tema.criterios[0].ordem, 1)
    assert.equal(tema.criterios[1].ordem, 2)
  })

  it('deve ocultar um tema arquivado', async () => {
    const resposta = await request(app)
      .get(`/api/aluno/temas/${temaArquivado.id}`)
      .set(
        'Authorization',
        `Bearer ${alunoMatriculado.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_TOPIC_NOT_FOUND',
    )
  })

  it('deve ocultar um tema pertencente a outra turma', async () => {
    const resposta = await request(app)
      .get(`/api/aluno/temas/${temaOutraTurma.id}`)
      .set(
        'Authorization',
        `Bearer ${alunoMatriculado.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ESSAY_TOPIC_NOT_FOUND',
    )
  })

  it('deve exigir uma matrícula ativa', async () => {
    const resposta = await request(app)
      .get('/api/aluno/temas')
      .set(
        'Authorization',
        `Bearer ${alunoSemMatricula.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ACTIVE_ENROLLMENT_NOT_FOUND',
    )
  })

  it('deve bloquear o acesso de professores', async () => {
    const resposta = await request(app)
      .get('/api/aluno/temas')
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
  })

  it('deve exigir autenticação', async () => {
    const resposta = await request(app)
      .get('/api/aluno/temas')
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })

  it('deve rejeitar um identificador de tema inválido', async () => {
    const resposta = await request(app)
      .get('/api/aluno/temas/identificador-invalido')
      .set(
        'Authorization',
        `Bearer ${alunoMatriculado.accessToken}`,
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })
})