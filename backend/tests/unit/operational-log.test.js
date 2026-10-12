import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { criarRegistroOperacional, registrarEvento } from '../../src/utils/operational-log.js'
import { criarObservabilidadeRequisicao } from '../../src/middlewares/request-observability.js'
import { errorHandler } from '../../src/middlewares/error-handler.js'

test('log admite somente metadados e exclui corpo, headers, URL e exceção', () => {
  const dados = { metodo: 'POST', status: 503, codigo: 'GEMINI_TIMEOUT', duracaoMs: 42.2, requestId: '00000000-0000-4000-8000-000000000001', body: { senha: 'segredo' }, url: '/?token=segredo', email: 'privado@example.com', error: new Error('segredo'), message: 'segredo', headers: { authorization: 'segredo' } }
  const registro = criarRegistroOperacional('request_error', dados, new Date(0))
  assert.deepEqual(Object.keys(registro).sort(), ['evento', 'instante', 'requestId', 'metodo', 'status', 'duracaoMs', 'codigo'].sort())
  assert.doesNotMatch(JSON.stringify(registro), /segredo|privado|authorization/)
  assert.equal(registro.duracaoMs, 42)
  let escrito
  registrarEvento('request_error', dados, valor => { escrito = JSON.parse(valor) })
  assert.equal(escrito.codigo, 'GEMINI_TIMEOUT')
})

test('log rejeita injeção por campos de metadados', () => {
  const registro = criarRegistroOperacional('segredo', { codigo: 'TOKEN\nsegredo', requestId: 'segredo', metodo: 'segredo', status: -1, duracaoMs: Infinity })
  assert.deepEqual(Object.keys(registro), ['evento', 'instante'])
})

test('requisicao gera ID próprio e registra conclusão sem URL nem conta', () => {
  const res = new EventEmitter()
  let id, evento
  res.statusCode = 200
  res.setHeader = (nome, valor) => { assert.equal(nome, 'X-Request-Id'); id = valor }
  const req = { method: 'GET', headers: { 'x-request-id': 'segredo' }, originalUrl: '/?token=segredo' }
  let proximo = false
  criarObservabilidadeRequisicao({ registrar: (nome, dados) => { evento = { nome, dados } } })(req, res, () => { proximo = true })
  res.emit('finish')
  assert.equal(proximo, true)
  assert.equal(req.requestId, id)
  assert.match(id, /^[0-9a-f-]{36}$/)
  assert.equal(evento.nome, 'http_request')
  assert.equal(evento.dados.status, 200)
  assert.doesNotMatch(JSON.stringify(evento), /segredo/)
})

test('erro inesperado nunca devolve mensagem bruta ao cliente', () => {
  let resultado
  const res = { status(codigo) { assert.equal(codigo, 500); return this }, json(valor) { resultado = valor } }
  errorHandler(new Error('senha=segredo e SQL privado'), {}, res, () => {})
  assert.deepEqual(resultado, { error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } })
})
