import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import request from 'supertest'

import { app } from '../../src/app.js'
import { prisma } from '../../src/config/prisma.js'

after(async () => {
  await prisma.$disconnect()
})

describe('GET /health', () => {
  it('deve confirmar que a API e o banco estão disponíveis', async () => {
    const resposta = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200)

    assert.equal(resposta.body.status, 'ok')
    assert.equal(resposta.body.service, 'lexis-api')
    assert.equal(resposta.body.database, 'connected')

    assert.ok(
      !Number.isNaN(Date.parse(resposta.body.timestamp)),
      'O timestamp deve conter uma data válida',
    )
  })
})