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

const prefixoEmail = 'teste.rota.turmas.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professorPrincipal
let professorSecundario
let aluno

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

async function criarTurmaPelaApi(
  accessToken,
  nome = 'Turma de Teste',
) {
  const resposta = await request(app)
    .post('/api/turmas')
    .set(
      'Authorization',
      `Bearer ${accessToken}`,
    )
    .send({
      nome,
    })
    .expect('Content-Type', /json/)
    .expect(201)

  return resposta.body.data.turma
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

  aluno = await criarUsuarioComSessao({
    nome: 'Aluno de Teste',
    papel: 'ALUNO',
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

describe('Rotas de turmas do professor', () => {
  it('deve criar uma turma com código de acesso', async () => {
    const turma = await criarTurmaPelaApi(
      professorPrincipal.accessToken,
      '  Turma   3º Ano A  ',
    )

    assert.equal(turma.nome, 'Turma 3º Ano A')
    assert.equal(
      turma.professor.id,
      professorPrincipal.usuario.id,
    )
    assert.equal(turma.ativa, true)
    assert.match(
      turma.codigoAcesso,
      /^[A-HJ-NP-Z2-9]{8}$/,
    )
    assert.equal(turma.quantidadeAlunosAtivos, 0)
    assert.equal(turma.quantidadeTemasAtivos, 0)
  })

  it('deve listar somente as turmas do professor', async () => {
    const turmaPrincipal = await criarTurmaPelaApi(
      professorPrincipal.accessToken,
      'Turma do Professor Principal',
    )

    const turmaSecundaria = await criarTurmaPelaApi(
      professorSecundario.accessToken,
      'Turma do Professor Secundário',
    )

    const resposta = await request(app)
      .get('/api/turmas')
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const turmas = resposta.body.data.turmas

    assert.equal(Array.isArray(turmas), true)
    assert.equal(
      turmas.some(
        (turma) => turma.id === turmaPrincipal.id,
      ),
      true,
    )
    assert.equal(
      turmas.some(
        (turma) => turma.id === turmaSecundaria.id,
      ),
      false,
    )
  })

  it('deve exigir autenticação', async () => {
    const resposta = await request(app)
      .get('/api/turmas')
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })

  it('deve bloquear o acesso de alunos', async () => {
    const resposta = await request(app)
      .post('/api/turmas')
      .set(
        'Authorization',
        `Bearer ${aluno.accessToken}`,
      )
      .send({
        nome: 'Turma Não Permitida',
      })
      .expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
  })

  it('deve ocultar turmas de outro professor', async () => {
    const turma = await criarTurmaPelaApi(
      professorSecundario.accessToken,
      'Turma Particular',
    )

    const resposta = await request(app)
      .get(`/api/turmas/${turma.id}`)
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

  it('deve rejeitar um identificador inválido', async () => {
    const resposta = await request(app)
      .get('/api/turmas/id-invalido')
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

  it('deve renomear uma turma ativa', async () => {
    const turma = await criarTurmaPelaApi(
      professorPrincipal.accessToken,
      'Nome Antigo',
    )

    const resposta = await request(app)
      .patch(`/api/turmas/${turma.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        nome: '  Nome   Atualizado  ',
      })
      .expect(200)

    assert.equal(
      resposta.body.data.turma.nome,
      'Nome Atualizado',
    )
  })

  it('deve regenerar o código de acesso', async () => {
    const turma = await criarTurmaPelaApi(
      professorPrincipal.accessToken,
      'Turma com Novo Código',
    )

    const resposta = await request(app)
      .post(
        `/api/turmas/${turma.id}/regenerar-codigo`,
      )
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    const novoCodigo =
      resposta.body.data.turma.codigoAcesso

    assert.match(
      novoCodigo,
      /^[A-HJ-NP-Z2-9]{8}$/,
    )
    assert.notEqual(novoCodigo, turma.codigoAcesso)
  })

  it('deve arquivar a turma e encerrar suas matrículas', async () => {
    const turma = await criarTurmaPelaApi(
      professorPrincipal.accessToken,
      'Turma para Arquivamento',
    )

    const matricula = await prisma.matricula.create({
      data: {
        alunoId: aluno.usuario.id,
        turmaId: turma.id,
      },
    })

    const resposta = await request(app)
      .post(`/api/turmas/${turma.id}/arquivar`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .expect(200)

    assert.equal(
      resposta.body.data.turma.ativa,
      false,
    )
    assert.equal(
      resposta.body.data.turma.quantidadeAlunosAtivos,
      0,
    )

    const matriculaAtualizada =
      await prisma.matricula.findUnique({
        where: {
          id: matricula.id,
        },
      })

    assert.equal(
      matriculaAtualizada.status,
      'ENCERRADA',
    )
    assert.ok(matriculaAtualizada.encerradaEm)

    const respostaRenomear = await request(app)
      .patch(`/api/turmas/${turma.id}`)
      .set(
        'Authorization',
        `Bearer ${professorPrincipal.accessToken}`,
      )
      .send({
        nome: 'Alteração Proibida',
      })
      .expect(409)

    assert.equal(
      respostaRenomear.body.error.code,
      'CLASS_ARCHIVED',
    )
  })
})