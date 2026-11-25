import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import express from 'express'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { errorHandler } from '../../src/middlewares/error-handler.js'
import { swaggerSpec } from '../../src/docs/swagger.js'

const marcador = 'CONTEUDO_PRIVADO_FICTICIO'
after(() => prisma.$disconnect())

async function conferirSemVazamento(t, executar) {
  const anterior = env.NODE_ENV
  const logs = []
  t.mock.method(console, 'info', (valor) => logs.push(JSON.parse(valor)))
  env.NODE_ENV = 'development'
  try {
    const resposta = await executar()
    assert.doesNotMatch(JSON.stringify({ resposta: resposta.body, logs }), new RegExp(marcador))
    assert.equal(logs.length, 1)
    assert.equal(logs[0].status, resposta.status)
    assert.equal(logs[0].codigo, resposta.body.error.code)
    assert.deepEqual(Object.keys(logs[0]).sort(), ['codigo', 'evento', 'instante', 'requestId', 'status'].sort())
    return resposta
  } finally {
    env.NODE_ENV = anterior
    t.mock.restoreAll()
  }
}

test('JSON malformado retorna 400 sem expor corpo ou erro bruto nos logs', async (t) => {
  const resposta = await conferirSemVazamento(t, () => request(app)
    .post('/api/auth/login').set('Content-Type', 'application/json')
    .send(`{"senha":"${marcador}",`).expect(400))
  assert.deepEqual(resposta.body, { error: { code: 'INVALID_JSON', message: 'O corpo da requisição contém JSON inválido.' } })
})

test('JSON maior que 1 MB retorna 413 sem refletir conteúdo nos logs', async (t) => {
  const resposta = await conferirSemVazamento(t, () => request(app)
    .post('/api/auth/login').set('Content-Type', 'application/json')
    .send(JSON.stringify({ senha: marcador, texto: 'x'.repeat(1048576) })).expect(413))
  assert.deepEqual(resposta.body, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'O corpo da requisição excede o limite permitido.' } })
})

test('JSON válido continua usando a validação de domínio', async () => {
  const resposta = await request(app).post('/api/auth/login')
    .set('Content-Type', 'application/json').send('{}').expect(422)
  assert.equal(resposta.body.error.code, 'VALIDATION_ERROR')
})

test('erro interno com Content-Type JSON continua 500 e não expõe detalhes', async () => {
  const interna = express()
  interna.use(express.json())
  interna.post('/falha', () => { throw new Error(marcador) })
  interna.use(errorHandler)
  const resposta = await request(interna).post('/falha').set('Content-Type', 'application/json')
    .send({ segredo: marcador }).expect(500)
  assert.deepEqual(resposta.body, { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } })
})

test('SyntaxError genérico e status HTTP isolado não são confundidos com erros do parser', async () => {
  for (const erro of [new SyntaxError(marcador), Object.assign(new Error(marcador), { status: 400, type: 'entity.parse.failed' })]) {
    const interna = express()
    interna.post('/falha', (_req, _res, next) => next(erro))
    interna.use(errorHandler)
    const resposta = await request(interna).post('/falha').set('Content-Type', 'application/json').send('{}').expect(500)
    assert.equal(resposta.body.error.code, 'INTERNAL_ERROR')
    assert.doesNotMatch(JSON.stringify(resposta.body), new RegExp(marcador))
  }
})

test('OpenAPI documenta os erros do parser nas operações com corpo JSON', () => {
  let operacoes = 0
  for (const item of Object.values(swaggerSpec.paths)) {
    for (const metodo of ['post', 'put', 'patch', 'delete']) {
      const operacao = item[metodo]
      if (!operacao?.requestBody?.content?.['application/json']) continue
      operacoes++
      for (const status of ['400', '413']) assert.ok(operacao.responses[status], `Falta ${status} em ${metodo}`)
    }
  }
  assert.ok(operacoes > 0)
  assert.equal(swaggerSpec.components.responses.InvalidJson.content['application/json'].schema.properties.error.properties.code.example, 'INVALID_JSON')
  assert.equal(swaggerSpec.components.responses.PayloadTooLarge.content['application/json'].schema.properties.error.properties.code.example, 'PAYLOAD_TOO_LARGE')
})
