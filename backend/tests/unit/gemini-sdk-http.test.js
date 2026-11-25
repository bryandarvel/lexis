import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { test } from 'node:test'
import { GoogleGenAI } from '@google/genai'
import { gerarConteudoComGemini } from '../../src/integrations/gemini.client.js'
import { criarControleChamadasGemini } from '../../src/integrations/gemini-call-control.js'

// Adaptação da abordagem do Lucas no PR #70 para generateContent.
// Chave fictícia e servidor de loopback: nenhum pedido sai da máquina.
function criarCliente(porta) {
  return new GoogleGenAI({
    apiKey: 'fixture-local-sem-credencial-real',
    httpOptions: {
      baseUrl: `http://127.0.0.1:${porta}`,
      // O guard por chamada deve prevalecer mesmo se a configuração do cliente
      // passar a permitir repetições. Sem ele, os casos HTTP 429 e 503 repetem.
      retryOptions: { attempts: 5, initialDelay: 0.001, maxDelay: 0.001, jitter: 0 },
    },
  })
}

function chamar(porta) {
  return gerarConteudoComGemini({ input: 'Texto inteiramente fictício.' }, {
    cliente: criarCliente(porta), model: 'modelo-local', timeoutMs: 2000,
    controle: criarControleChamadasGemini(),
  })
}

async function iniciarServidor(status, corpo) {
  let chamadas = 0
  const servidor = http.createServer((req, res) => {
    chamadas += 1
    assert.match(req.url, /\/models\/modelo-local:generateContent$/)
    req.resume()
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(corpo))
  })
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve))
  return {
    porta: servidor.address().port,
    chamadas: () => chamadas,
    fechar: () => new Promise(resolve => servidor.close(resolve)),
  }
}

for (const [status, codigo, statusLocal] of [
  [429, 'GEMINI_SERVICE_LIMIT_REACHED', 503],
  [503, 'GEMINI_SERVICE_UNAVAILABLE', 502],
]) {
  test(`SDK real faz uma única requisição HTTP ${status}, mesmo com cliente configurado para cinco`, async () => {
    const servidor = await iniciarServidor(status, { error: { code: status, message: 'Corpo externo fictício privado.' } })
    try {
      await assert.rejects(() => chamar(servidor.porta), erro => {
        assert.equal(erro.code, codigo)
        assert.equal(erro.statusCode, statusLocal)
        assert.doesNotMatch(erro.message, /Corpo externo|fixture-local/)
        return true
      })
      assert.equal(servidor.chamadas(), 1)
    } finally {
      await servidor.fechar()
    }
  })
}

test('SDK real faz uma tentativa em conexão recusada e devolve diagnóstico seguro', async t => {
  const servidor = net.createServer()
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve))
  const porta = servidor.address().port
  await new Promise(resolve => servidor.close(resolve))
  const original = globalThis.fetch
  const fetch = t.mock.method(globalThis, 'fetch', (...args) => original(...args))
  await assert.rejects(() => chamar(porta), { code: 'GEMINI_CONNECTION_FAILED', statusCode: 502 })
  assert.equal(fetch.mock.callCount(), 1)
})

test('SDK real mantém sucesso em uma requisição, controle que também passa sem o guard', async () => {
  const servidor = await iniciarServidor(200, {
    responseId: 'resposta-local-ficticia',
    candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: '  RESPOSTA_LOCAL  ' }] } }],
  })
  try {
    const resultado = await chamar(servidor.porta)
    assert.equal(resultado.texto, 'RESPOSTA_LOCAL')
    assert.equal(resultado.interacaoId, 'resposta-local-ficticia')
    assert.equal(servidor.chamadas(), 1)
  } finally {
    await servidor.fechar()
  }
})
