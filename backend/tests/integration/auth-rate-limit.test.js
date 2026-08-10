import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import request from 'supertest'

import { app } from '../../src/app.js'

describe('Limites das rotas de autenticação', () => {
  it('deve limitar falhas excessivas de login', async () => {
    const dadosInvalidos = {
      email: 'limitador.login@exemplo.com',
      senha: '',
    }

    for (let tentativa = 1; tentativa <= 10; tentativa += 1) {
      await request(app)
        .post('/api/auth/login')
        .send(dadosInvalidos)
        .expect(422)
    }

    const resposta = await request(app)
      .post('/api/auth/login')
      .send(dadosInvalidos)
      .expect(429)

    assert.equal(
      resposta.body.error.code,
      'RATE_LIMIT_EXCEEDED',
    )
  })

  it('deve limitar cadastros excessivos', async () => {
    const dadosInvalidos = {
      email: 'limitador.cadastro@exemplo.com',
    }

    for (let tentativa = 1; tentativa <= 50; tentativa += 1) {
      await request(app)
        .post('/api/auth/cadastro')
        .send(dadosInvalidos)
        .expect(422)
    }

    const resposta = await request(app)
      .post('/api/auth/cadastro')
      .send(dadosInvalidos)
      .expect(429)

    assert.equal(
      resposta.body.error.code,
      'RATE_LIMIT_EXCEEDED',
    )
  })

  it('deve limitar renovações inválidas excessivas', async () => {
    for (let tentativa = 1; tentativa <= 60; tentativa += 1) {
      await request(app)
        .post('/api/auth/refresh')
        .expect(401)
    }

    const resposta = await request(app)
      .post('/api/auth/refresh')
      .expect(429)

    assert.equal(
      resposta.body.error.code,
      'RATE_LIMIT_EXCEEDED',
    )
  })
})