import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'

import { app } from '../../src/app.js'

describe('Rota inexistente', () => {
  it('deve retornar um erro 404 estruturado', async () => {
    const resposta = await request(app)
      .get('/rota-inexistente')
      .expect('Content-Type', /json/)
      .expect(404)

    assert.deepEqual(resposta.body, {
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Rota não encontrada.',
        method: 'GET',
        path: '/rota-inexistente',
      },
    })
  })
})