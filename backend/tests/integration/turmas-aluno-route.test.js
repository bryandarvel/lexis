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

const prefixoEmail = 'teste.rota.matriculas.'
const senha = 'SenhaSegura123'

let bancoDeTesteConfirmado = false
let professor
let aluno
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

function requisicaoEntrarTurma(codigoAcesso) {
  return request(app)
    .post('/api/turmas/entrar')
    .set(
      'Authorization',
      `Bearer ${aluno.accessToken}`,
    )
    .send({
      codigoAcesso,
    })
}

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true

  professor = await criarUsuarioComSessao({
    nome: 'Professor das Matrículas',
    papel: 'PROFESSOR',
  })

  aluno = await criarUsuarioComSessao({
    nome: 'Aluno das Matrículas',
    papel: 'ALUNO',
  })

  turmaPrincipal = await criarTurmaParaProfessor({
    nome: 'Turma Principal',
    professorId: professor.usuario.id,
  })

  turmaSecundaria = await criarTurmaParaProfessor({
    nome: 'Turma Secundária',
    professorId: professor.usuario.id,
  })
})

beforeEach(async () => {
  if (aluno?.usuario?.id) {
    await prisma.matricula.deleteMany({
      where: {
        alunoId: aluno.usuario.id,
      },
    })
  }
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
      await prisma.notificacao.deleteMany({
        where: { usuarioId: { in: usuarioIds } },
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

describe('Rotas de matrícula do aluno', () => {
  it('deve entrar em uma turma pelo código', async () => {
    const codigoFormatado =
      `  ${turmaPrincipal.codigoAcesso
        .toLowerCase()
        .split('')
        .join(' ')}  `

    const resposta = await requisicaoEntrarTurma(
      codigoFormatado,
    )
      .expect('Content-Type', /json/)
      .expect(201)

    const matricula = resposta.body.data.matricula

    assert.equal(matricula.status, 'ATIVA')
    assert.equal(
      matricula.turma.id,
      turmaPrincipal.id,
    )
    assert.equal(
      matricula.turma.professor.id,
      professor.usuario.id,
    )
  })

  it('deve rejeitar um código malformado', async () => {
    const resposta = await requisicaoEntrarTurma(
      'codigo-invalido',
    ).expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve rejeitar um código inexistente', async () => {
    const resposta = await requisicaoEntrarTurma(
      'AAAAAAAA',
    ).expect(404)

    assert.equal(
      resposta.body.error.code,
      'CLASS_ACCESS_CODE_INVALID',
    )
  })

  it('deve impedir que um professor se matricule', async () => {
    const resposta = await request(app)
      .post('/api/turmas/entrar')
      .set(
        'Authorization',
        `Bearer ${professor.accessToken}`,
      )
      .send({
        codigoAcesso: turmaPrincipal.codigoAcesso,
      })
      .expect(403)

    assert.equal(
      resposta.body.error.code,
      'FORBIDDEN',
    )
  })

  it('deve rejeitar uma matrícula repetida', async () => {
    await requisicaoEntrarTurma(
      turmaPrincipal.codigoAcesso,
    ).expect(201)

    const resposta = await requisicaoEntrarTurma(
      turmaPrincipal.codigoAcesso,
    ).expect(409)

    assert.equal(
      resposta.body.error.code,
      'ALREADY_ENROLLED_IN_CLASS',
    )
  })

  it('deve impedir duas matrículas ativas', async () => {
    await requisicaoEntrarTurma(
      turmaPrincipal.codigoAcesso,
    ).expect(201)

    const resposta = await requisicaoEntrarTurma(
      turmaSecundaria.codigoAcesso,
    ).expect(409)

    assert.equal(
      resposta.body.error.code,
      'ACTIVE_ENROLLMENT_EXISTS',
    )
  })

  it('deve retornar 404 sem matrícula ativa', async () => {
    const resposta = await request(app)
      .get('/api/turmas/minha-matricula')
      .set(
        'Authorization',
        `Bearer ${aluno.accessToken}`,
      )
      .expect(404)

    assert.equal(
      resposta.body.error.code,
      'ACTIVE_ENROLLMENT_NOT_FOUND',
    )
  })

  it('deve consultar a matrícula ativa', async () => {
    await requisicaoEntrarTurma(
      turmaPrincipal.codigoAcesso,
    ).expect(201)

    const resposta = await request(app)
      .get('/api/turmas/minha-matricula')
      .set(
        'Authorization',
        `Bearer ${aluno.accessToken}`,
      )
      .expect(200)

    assert.equal(
      resposta.body.data.matricula.turma.id,
      turmaPrincipal.id,
    )
    assert.equal(
      resposta.body.data.matricula.status,
      'ATIVA',
    )
  })

  it('deve sair e depois entrar em outra turma', async () => {
    const primeiraResposta =
      await requisicaoEntrarTurma(
        turmaPrincipal.codigoAcesso,
      ).expect(201)

    const respostaSaida = await request(app)
      .delete('/api/turmas/minha-matricula')
      .set(
        'Authorization',
        `Bearer ${aluno.accessToken}`,
      )
      .send({ matriculaId: primeiraResposta.body.data.matricula.id })
      .expect(200)

    assert.equal(
      respostaSaida.body.data.matricula.id,
      primeiraResposta.body.data.matricula.id,
    )
    assert.equal(
      respostaSaida.body.data.matricula.status,
      'ENCERRADA',
    )
    assert.ok(
      respostaSaida.body.data.matricula.encerradaEm,
    )

    const segundaResposta =
      await requisicaoEntrarTurma(
        turmaSecundaria.codigoAcesso,
      ).expect(201)

    assert.equal(
      segundaResposta.body.data.matricula.turma.id,
      turmaSecundaria.id,
    )

    const matriculas =
      await prisma.matricula.findMany({
        where: {
          alunoId: aluno.usuario.id,
        },
        orderBy: {
          iniciadaEm: 'asc',
        },
      })

    assert.equal(matriculas.length, 2)
    assert.equal(matriculas[0].status, 'ENCERRADA')
    assert.equal(matriculas[1].status, 'ATIVA')
  })

  it('não deve encerrar a nova matrícula usando confirmação antiga de outra aba', async () => {
    const primeira = await requisicaoEntrarTurma(turmaPrincipal.codigoAcesso).expect(201)
    const matriculaId = primeira.body.data.matricula.id
    await request(app).delete('/api/turmas/minha-matricula')
      .set('Authorization', `Bearer ${aluno.accessToken}`)
      .send({ matriculaId }).expect(200)
    const segunda = await requisicaoEntrarTurma(turmaSecundaria.codigoAcesso).expect(201)
    const resposta = await request(app).delete('/api/turmas/minha-matricula')
      .set('Authorization', `Bearer ${aluno.accessToken}`)
      .send({ matriculaId }).expect(409)
    assert.equal(resposta.body.error.code, 'ACTIVE_ENROLLMENT_CHANGED')
    const atual = await prisma.matricula.findUnique({ where: { id: segunda.body.data.matricula.id } })
    assert.equal(atual.status, 'ATIVA')
  })

  it('deve encerrar a matrícula confirmada apenas uma vez em saídas simultâneas', async () => {
    const entrada = await requisicaoEntrarTurma(turmaPrincipal.codigoAcesso).expect(201)
    const matriculaId = entrada.body.data.matricula.id
    const respostas = await Promise.all([0, 1].map(() =>
      request(app).delete('/api/turmas/minha-matricula')
        .set('Authorization', `Bearer ${aluno.accessToken}`).send({ matriculaId }),
    ))
    assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 404])
    assert.equal(respostas.find((r) => r.status === 404).body.error.code, 'ACTIVE_ENROLLMENT_NOT_FOUND')
  })

  it('deve validar o identificador confirmado antes de qualquer alteração', async () => {
    await requisicaoEntrarTurma(turmaPrincipal.codigoAcesso).expect(201)
    for (const corpo of [{}, { matriculaId: 'invalido' }, { matriculaId: randomUUID(), extra: true }]) {
      const resposta = await request(app).delete('/api/turmas/minha-matricula')
        .set('Authorization', `Bearer ${aluno.accessToken}`).send(corpo).expect(422)
      assert.equal(resposta.body.error.code, 'VALIDATION_ERROR')
    }
    await request(app).delete('/api/turmas/minha-matricula')
      .set('Authorization', `Bearer ${aluno.accessToken}`).expect(422)
    assert.equal(await prisma.matricula.count({ where: { alunoId: aluno.usuario.id, status: 'ATIVA' } }), 1)
  })

  it('não deve aceitar matrícula de outro aluno nem expor seus dados', async () => {
    const outro = await criarUsuarioComSessao({ nome: 'Outro aluno fictício', papel: 'ALUNO' })
    const matriculaAlheia = await prisma.matricula.create({
      data: { alunoId: outro.usuario.id, turmaId: turmaPrincipal.id },
    })
    const propria = await requisicaoEntrarTurma(turmaSecundaria.codigoAcesso).expect(201)
    const resposta = await request(app).delete('/api/turmas/minha-matricula')
      .set('Authorization', `Bearer ${aluno.accessToken}`)
      .send({ matriculaId: matriculaAlheia.id }).expect(409)
    assert.equal(resposta.body.error.code, 'ACTIVE_ENROLLMENT_CHANGED')
    assert.equal(resposta.body.data, undefined)
    for (const id of [matriculaAlheia.id, propria.body.data.matricula.id]) {
      assert.equal((await prisma.matricula.findUnique({ where: { id } })).status, 'ATIVA')
    }
  })

  it('deve manter autenticação e papel obrigatórios na saída', async () => {
    const corpo = { matriculaId: randomUUID() }
    await request(app).delete('/api/turmas/minha-matricula').send(corpo).expect(401)
    await request(app).delete('/api/turmas/minha-matricula')
      .set('Authorization', `Bearer ${professor.accessToken}`).send(corpo).expect(403)
    const resposta = await request(app).delete('/api/turmas/minha-matricula')
      .set('Authorization', `Bearer ${aluno.accessToken}`).send(corpo).expect(404)
    assert.equal(resposta.body.error.code, 'ACTIVE_ENROLLMENT_NOT_FOUND')
  })

  it('deve impedir matrículas simultâneas', async () => {
    const respostas = await Promise.all([
      requisicaoEntrarTurma(
        turmaPrincipal.codigoAcesso,
      ),
      requisicaoEntrarTurma(
        turmaSecundaria.codigoAcesso,
      ),
    ])

    const statusRecebidos = respostas
      .map((resposta) => resposta.status)
      .sort((a, b) => a - b)

    assert.deepEqual(statusRecebidos, [201, 409])

    const quantidadeMatriculasAtivas =
      await prisma.matricula.count({
        where: {
          alunoId: aluno.usuario.id,
          status: 'ATIVA',
        },
      })

    assert.equal(quantidadeMatriculasAtivas, 1)
  })
})
