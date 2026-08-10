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
  criarTurmaParaProfessor,
} from '../../src/modules/turmas/turmas.service.js'

const prefixoEmail = 'teste.professor.alunos.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professorPrincipal
let professorSecundario
let alunoAna
let alunoBruno
let turmaPrincipal
let turmaSecundaria

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

async function criarMatricula(alunoId, turmaId) {
  return prisma.matricula.create({
    data: {
      alunoId,
      turmaId,
    },
  })
}

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true

  professorPrincipal = await criarUsuarioComSessao({
    nome: 'Professor Principal',
    papel: 'PROFESSOR',
  })

  professorSecundario = await criarUsuarioComSessao({
    nome: 'Professor Secundário',
    papel: 'PROFESSOR',
  })

  alunoAna = await criarUsuarioComSessao({
    nome: 'Ana Aluna',
    papel: 'ALUNO',
  })

  alunoBruno = await criarUsuarioComSessao({
    nome: 'Bruno Aluno',
    papel: 'ALUNO',
  })

  turmaPrincipal = await criarTurmaParaProfessor({
    nome: 'Turma Principal',
    professorId: professorPrincipal.usuario.id,
  })

  turmaSecundaria = await criarTurmaParaProfessor({
    nome: 'Turma Secundária',
    professorId: professorSecundario.usuario.id,
  })
})

beforeEach(async () => {
  const alunoIds = [
    alunoAna.usuario.id,
    alunoBruno.usuario.id,
  ]

  await prisma.matricula.deleteMany({
    where: {
      alunoId: {
        in: alunoIds,
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

describe('Gerenciamento dos alunos pelo professor', () => {
  it('deve listar os alunos ativos em ordem alfabética', async () => {
    await criarMatricula(
      alunoBruno.usuario.id,
      turmaPrincipal.id,
    )

    await criarMatricula(
      alunoAna.usuario.id,
      turmaPrincipal.id,
    )

    const resposta = await request(app)
      .get(`/api/turmas/${turmaPrincipal.id}/alunos`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const matriculas =
      resposta.body.data.matriculas

    assert.equal(matriculas.length, 2)
    assert.equal(
      matriculas[0].aluno.nome,
      'Ana Aluna',
    )
    assert.equal(
      matriculas[1].aluno.nome,
      'Bruno Aluno',
    )

    assert.equal(
      Object.hasOwn(
        matriculas[0].aluno,
        'senhaHash',
      ),
      false,
    )
  })

  it('deve ocultar alunos de outra turma', async () => {
    await criarMatricula(
      alunoAna.usuario.id,
      turmaSecundaria.id,
    )

    const resposta = await request(app)
      .get(`/api/turmas/${turmaSecundaria.id}/alunos`)
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

  it('deve bloquear a listagem para alunos', async () => {
    const resposta = await request(app)
      .get(`/api/turmas/${turmaPrincipal.id}/alunos`)
      .set(
        'Authorization',
        `Bearer ${alunoAna.accessToken}`,
      )
      .expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
  })

  it('deve desvincular um aluno da própria turma', async () => {
    const matricula = await criarMatricula(
      alunoAna.usuario.id,
      turmaPrincipal.id,
    )

    const resposta = await request(app)
      .delete(
        `/api/turmas/${turmaPrincipal.id}/alunos/${alunoAna.usuario.id}`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    assert.equal(
      resposta.body.data.matricula.id,
      matricula.id,
    )
    assert.equal(
      resposta.body.data.matricula.status,
      'ENCERRADA',
    )
    assert.ok(
      resposta.body.data.matricula.encerradaEm,
    )

    const matriculaNoBanco =
      await prisma.matricula.findUnique({
        where: {
          id: matricula.id,
        },
      })

    assert.equal(
      matriculaNoBanco.status,
      'ENCERRADA',
    )
  })

  it('deve retornar 404 para aluno não matriculado', async () => {
    const resposta = await request(app)
      .delete(
        `/api/turmas/${turmaPrincipal.id}/alunos/${alunoAna.usuario.id}`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ENROLLMENT_NOT_FOUND',
    )
  })

  it('deve impedir alterações em turma de outro professor', async () => {
    await criarMatricula(
      alunoAna.usuario.id,
      turmaSecundaria.id,
    )

    const resposta = await request(app)
      .delete(
        `/api/turmas/${turmaSecundaria.id}/alunos/${alunoAna.usuario.id}`,
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

  it('deve rejeitar um identificador de aluno inválido', async () => {
    const resposta = await request(app)
      .delete(
        `/api/turmas/${turmaPrincipal.id}/alunos/id-invalido`,
      )
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
})