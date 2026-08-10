import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import express from 'express'
import request from 'supertest'

import { errorHandler } from '../../src/middlewares/error-handler.js'
import { validarBody } from '../../src/middlewares/validate-request.js'
import { cadastroSchema } from '../../src/modules/auth/auth.schemas.js'

const appTeste = express()

appTeste.use(express.json())

appTeste.post(
  '/cadastro',
  validarBody(cadastroSchema),
  (req, res) => {
    return res.status(200).json(req.body)
  },
)

appTeste.use(errorHandler)

describe('Middleware de validação', () => {
  it('deve normalizar e encaminhar dados válidos', async () => {
    const resposta = await request(appTeste)
      .post('/cadastro')
      .send({
        nome: '  Ana   Souza  ',
        email: 'ANA@EXEMPLO.COM',
        senha: 'SenhaSegura123',
        papel: 'ALUNO',
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.equal(resposta.body.nome, 'Ana Souza')
    assert.equal(resposta.body.email, 'ana@exemplo.com')
  })

  it('deve retornar 422 e os campos inválidos', async () => {
    const resposta = await request(appTeste)
      .post('/cadastro')
      .send({
        nome: 'A',
        email: 'email-invalido',
        senha: 'fraca',
        papel: 'ADMINISTRADOR',
      })
      .expect('Content-Type', /json/)
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )

    assert.equal(
      resposta.body.error.message,
      'Dados de entrada inválidos.',
    )

    assert.ok(
      resposta.body.error.details.some(
        (detail) => detail.field === 'email',
      ),
    )

    assert.ok(
      resposta.body.error.details.some(
        (detail) => detail.field === 'senha',
      ),
    )
  })
})