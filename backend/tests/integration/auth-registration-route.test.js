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

const prefixoEmail = 'teste.rota.cadastro.'
let bancoDeTesteConfirmado = false

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true
})

after(async () => {
  if (bancoDeTesteConfirmado) {
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

describe('POST /api/auth/cadastro', () => {
  it('deve cadastrar e retornar o usuário sem a senha', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`

    const resposta = await request(app)
      .post('/api/auth/cadastro')
      .send({
        nome: '  Maria   de Teste  ',
        email: email.toUpperCase(),
        senha: 'SenhaSegura123',
        papel: 'ALUNO',
      })
      .expect('Content-Type', /json/)
      .expect(201)

    assert.equal(resposta.body.data.usuario.nome, 'Maria de Teste')
    assert.equal(resposta.body.data.usuario.email, email)
    assert.equal(resposta.body.data.usuario.papel, 'ALUNO')

    assert.equal(
      Object.hasOwn(
        resposta.body.data.usuario,
        'senhaHash',
      ),
      false,
    )
  })

  it('deve retornar 409 para e-mail já cadastrado', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`

    const dados = {
      nome: 'Professor de Teste',
      email,
      senha: 'SenhaSegura123',
      papel: 'PROFESSOR',
    }

    await request(app)
      .post('/api/auth/cadastro')
      .send(dados)
      .expect(201)

    const resposta = await request(app)
      .post('/api/auth/cadastro')
      .send(dados)
      .expect(409)

    assert.equal(
      resposta.body.error.code,
      'EMAIL_ALREADY_IN_USE',
    )
  })

  it('deve retornar 422 para dados inválidos', async () => {
    const resposta = await request(app)
      .post('/api/auth/cadastro')
      .send({
        nome: 'A',
        email: 'email-invalido',
        senha: 'fraca',
        papel: 'ADMINISTRADOR',
      })
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })
})