import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  gerarConteudoComGemini as gerarComClienteReal,
} from '../../src/integrations/gemini.client.js'
import { criarControleChamadasGemini } from '../../src/integrations/gemini-call-control.js'

function gerarConteudoComGemini(entrada, opcoes = {}) {
  return gerarComClienteReal(entrada, { controle: criarControleChamadasGemini(), ...opcoes })
}

function criarClienteSimulado(implementacao) {
  return {
    models: {
      generateContent: implementacao,
    },
  }
}

describe('Cliente Google Gemini', () => {
  it('deve gerar conteúdo com JSON estruturado e uma tentativa, retornando texto e uso', async () => {
    let chamadaRecebida

    const cliente = criarClienteSimulado(
      async (parametros, opcoes) => {
        chamadaRecebida = {
          parametros,
          opcoes,
        }

        return {
          responseId: 'resposta-1',
          candidates: [{ finishReason: 'STOP' }],
          text: '  LEXIS_GEMINI_OK  ',
          usageMetadata: {
            totalTokenCount: 12,
          },
        }
      },
    )

    const responseFormat = {
      type: 'text',
      mime_type: 'application/json',
      schema: {
        type: 'object',
      },
    }

    const resultado = await gerarConteudoComGemini(
      {
        input: 'Conteúdo de teste',
        systemInstruction: 'Instrução de teste',
        responseFormat,
        generationConfig: {
          temperature: 0.2,
        },
      },
      {
        cliente,
        model: 'gemini-teste',
        timeoutMs: 45000,
      },
    )

    assert.deepEqual(
      chamadaRecebida.parametros,
      {
        model: 'gemini-teste',
        contents: 'Conteúdo de teste',
        config: {
          temperature: 0.2,
          systemInstruction: 'Instrução de teste',
          responseMimeType: 'application/json',
          responseJsonSchema: responseFormat.schema,
          httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } },
        },
      },
    )
    assert.equal(chamadaRecebida.opcoes, undefined)
    assert.deepEqual(resultado, {
      texto: 'LEXIS_GEMINI_OK',
      interacaoId: 'resposta-1',
      status: 'completed',
      uso: {
        totalTokenCount: 12,
      },
    })
  })

  it('deve rejeitar quando a integração não estiver configurada', async () => {
    await assert.rejects(
      () =>
        gerarConteudoComGemini(
          {
            input: 'Teste',
          },
          {
            apiKey: '',
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 503)
        assert.equal(
          erro.code,
          'GEMINI_NOT_CONFIGURED',
        )

        return true
      },
    )
  })

  it('deve rejeitar uma resposta sem texto', async () => {
    const cliente = criarClienteSimulado(
      async () => ({
        text: '   ',
      }),
    )

    await assert.rejects(
      () =>
        gerarConteudoComGemini(
          {
            input: 'Teste',
          },
          {
            cliente,
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 502)
        assert.equal(
          erro.code,
          'GEMINI_INVALID_RESPONSE',
        )

        return true
      },
    )
  })

  it('deve transformar timeout em erro estruturado', async () => {
    const cliente = criarClienteSimulado(
      async () => {
        const erro = new Error('Tempo excedido')
        erro.name = 'TimeoutError'

        throw erro
      },
    )

    await assert.rejects(
      () =>
        gerarConteudoComGemini(
          {
            input: 'Teste',
          },
          {
            cliente,
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 504)
        assert.equal(erro.code, 'GEMINI_TIMEOUT')

        return true
      },
    )
  })

  it('deve informar quando o limite externo for atingido', async () => {
    const cliente = criarClienteSimulado(
      async () => {
        const erro = new Error('Limite atingido')
        erro.status = 429

        throw erro
      },
    )

    await assert.rejects(
      () =>
        gerarConteudoComGemini(
          {
            input: 'Teste',
          },
          {
            cliente,
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 503)
        assert.equal(
          erro.code,
          'GEMINI_SERVICE_LIMIT_REACHED',
        )

        return true
      },
    )
  })

  it('deve transformar falha de autenticação externa em erro estruturado', async () => {
    const cliente = criarClienteSimulado(
      async () => {
        const erro = new Error('Chave inválida')
        erro.status = 401

        throw erro
      },
    )

    await assert.rejects(
      () =>
        gerarConteudoComGemini(
          {
            input: 'Teste',
          },
          {
            cliente,
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 503)
        assert.equal(
          erro.code,
          'GEMINI_AUTHENTICATION_FAILED',
        )

        return true
      },
    )
  })

  it('deve transformar falha externa em erro estruturado', async () => {
    const cliente = criarClienteSimulado(
      async () => {
        const erro = new Error('Falha externa')
        erro.status = 500

        throw erro
      },
    )

    await assert.rejects(
      () =>
        gerarConteudoComGemini(
          {
            input: 'Teste',
          },
          {
            cliente,
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 502)
        assert.equal(
          erro.code,
          'GEMINI_SERVICE_UNAVAILABLE',
        )
        assert.equal(erro.details.statusExterno, 500)

        return true
      },
    )
  })

  it('deve fazer exatamente uma chamada HTTP com o SDK real diante de 429, sem rede', async (t) => {
    const fetchSimulado = t.mock.method(globalThis, 'fetch', async () => new Response(
      JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'fixture secreta que não pode sair no erro', details: [
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '123s' },
      ] } }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '123' } },
    ))
    await assert.rejects(
      () => gerarConteudoComGemini({ input: 'Texto inteiramente fictício.' }, { apiKey: 'fixture-chave-nao-real', model: 'gemini-teste' }),
      (erro) => {
        assert.equal(erro.code, 'GEMINI_SERVICE_LIMIT_REACHED')
        assert.deepEqual(erro.details, { statusExterno: 429, codigoProvedor: 'unknown', retryAfterSeconds: 123 })
        assert.doesNotMatch(erro.message, /fixture secreta|fixture-chave/)
        return true
      },
    )
    assert.equal(fetchSimulado.mock.callCount(), 1)
  })

  it('deve enviar o contrato generateContent pelo SDK real, sem rede nem parâmetros de Interactions', async (t) => {
    let corpoRecebido
    const fetchSimulado = t.mock.method(globalThis, 'fetch', async (url, opcoes) => {
      assert.match(String(url), /\/models\/gemini-3\.6-flash:generateContent$/)
      corpoRecebido = JSON.parse(opcoes.body)
      return new Response(JSON.stringify({
        responseId: 'resposta-ficticia',
        candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: '{"ok":true}' }] } }],
        usageMetadata: { totalTokenCount: 20 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false }
    const resultado = await gerarConteudoComGemini({
      input: 'Texto fictício', systemInstruction: 'Somente JSON',
      responseFormat: { type: 'text', mime_type: 'application/json', schema },
      generationConfig: { temperature: 0.2 },
    }, { apiKey: 'fixture-chave-nao-real', model: 'gemini-3.6-flash' })
    assert.equal(fetchSimulado.mock.callCount(), 1)
    assert.deepEqual(corpoRecebido.contents, [{ role: 'user', parts: [{ text: 'Texto fictício' }] }])
    assert.deepEqual(corpoRecebido.systemInstruction.parts, [{ text: 'Somente JSON' }])
    assert.deepEqual(corpoRecebido.generationConfig, { responseMimeType: 'application/json', responseJsonSchema: schema })
    for (const campo of ['store', 'input', 'response_format', 'generation_config']) assert.equal(campo in corpoRecebido, false)
    assert.deepEqual(resultado, { texto: '{"ok":true}', interacaoId: 'resposta-ficticia', status: 'completed', uso: { totalTokenCount: 20 } })
  })

  for (const model of ['gemini-3.5-flash-lite', 'models/gemini-3.5-flash-lite', 'gemini-3.5-flash-lite-preview', 'gemini-3.6-flash', 'models/gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-4-pro']) {
    it(`deve omitir amostragem descontinuada em ${model} sem mudar outras opções`, async () => {
      let config
      const cliente = criarClienteSimulado(async (parametros) => { config = parametros.config; return { text: 'Fictício' } })
      await gerarConteudoComGemini({ input: 'Fictício', generationConfig: { temperature: 0.2, topP: 0.9, topK: 40, maxOutputTokens: 8192 } }, { cliente, model })
      assert.equal(config.temperature, undefined)
      assert.equal(config.topP, undefined)
      assert.equal(config.topK, undefined)
      assert.equal(config.maxOutputTokens, 8192)
    })
  }

  for (const finishReason of ['MAX_TOKENS', 'SAFETY', 'RECITATION']) {
    it(`deve rejeitar texto parcial ou bloqueado com ${finishReason}`, async () => {
      const cliente = criarClienteSimulado(async () => ({ text: '{"parcial":true}', candidates: [{ finishReason }] }))
      await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente }), { code: 'GEMINI_INVALID_RESPONSE' })
    })
  }

  for (const retryDelay of ['invalido', '-2s', '999999999999999999999s']) {
    it(`deve ignorar RetryInfo inválido ${retryDelay} sem expor mensagem`, async () => {
      const cliente = criarClienteSimulado(async () => {
        throw Object.assign(new Error(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'segredo', details: [
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay },
        ] } })), { name: 'ApiError', status: 429 })
      })
      await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente }), (erro) => {
        assert.equal(erro.code, 'GEMINI_SERVICE_LIMIT_REACHED')
        assert.equal(erro.details.retryAfterSeconds, 60)
        assert.doesNotMatch(erro.message, /segredo/)
        return true
      })
    })
  }

  it('deve tratar ApiError com mensagem não JSON sem vazar seu conteúdo', async () => {
    const cliente = criarClienteSimulado(async () => { throw Object.assign(new Error('segredo não JSON'), { name: 'ApiError', status: 429 }) })
    await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente }), (erro) => {
      assert.equal(erro.code, 'GEMINI_SERVICE_LIMIT_REACHED')
      assert.equal(erro.details.retryAfterSeconds, 60)
      assert.doesNotMatch(erro.message, /segredo/)
      return true
    })
  })

  for (const [provedor, codigo] of [
    ['rate_limit_exceeded', 'GEMINI_RATE_LIMITED'],
    ['quota_exceeded', 'GEMINI_DAILY_QUOTA_EXCEEDED'],
    ['codigo-novo-com-dado-sensivel', 'GEMINI_SERVICE_LIMIT_REACHED'],
  ]) {
    it(`deve classificar ${provedor} sem expor mensagem ou propriedades externas`, async () => {
      const cliente = criarClienteSimulado(async () => {
        throw Object.assign(new Error('segredo externo e conteúdo fictício privado'), {
          statusCode: 429,
          error: { code: provedor, message: 'segredo externo', dados: 'segredo externo' },
          headers: new Headers({ 'Retry-After': 'invalid-value', 'x-private': 'segredo externo' }),
        })
      })
      await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente }), (erro) => {
        assert.equal(erro.code, codigo)
        assert.equal(erro.details.retryAfterSeconds, 60)
        assert.equal(erro.details.codigoProvedor, provedor === 'codigo-novo-com-dado-sensivel' ? 'unknown' : provedor)
        assert.doesNotMatch(erro.message + JSON.stringify(erro.details), /segredo|sensivel|conteúdo fictício/)
        assert.match(erro.message, /não garante/)
        return true
      })
    })
  }

  for (const [valor, esperado] of [
    ['Thu, 15 Oct 2026 12:02:00 GMT', 120],
    ['Thu, 15 Oct 2026 11:59:00 GMT', 60],
    ['0', 60],
    ['999999999999999999999', 60],
    ['-10', 60],
  ]) {
    it(`deve tratar Retry-After ${valor} com espera segura`, async () => {
      const instante = Date.parse('2026-10-15T12:00:00Z')
      const controle = criarControleChamadasGemini({ agora: () => instante })
      const cliente = criarClienteSimulado(async () => {
        throw Object.assign(new Error('Erro simulado'), { status: 429, headers: { 'retry-after': valor } })
      })
      await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente, controle, agora: () => instante }), (erro) => {
        assert.equal(erro.details.retryAfterSeconds, esperado)
        return true
      })
    })
  }

  it('deve liberar o controle depois de falha sem repetir a chamada', async () => {
    let instante = 0
    let chamadas = 0
    const controle = criarControleChamadasGemini({ agora: () => instante })
    const cliente = criarClienteSimulado(async () => {
      chamadas += 1
      throw Object.assign(new Error('Falha'), { status: 500 })
    })
    await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente, controle }), { code: 'GEMINI_SERVICE_UNAVAILABLE' })
    instante = 30000
    await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente, controle }), { code: 'GEMINI_SERVICE_UNAVAILABLE' })
    assert.equal(chamadas, 2)
  })

  it('deve impedir outra chamada ao provedor durante espera e liberar após expiração', async () => {
    let instante = 0
    let chamadas = 0
    const controle = criarControleChamadasGemini({ agora: () => instante })
    const cliente = criarClienteSimulado(async () => {
      chamadas += 1
      if (chamadas === 1) throw Object.assign(new Error('Limite'), { status: 429, headers: new Headers({ 'Retry-After': '90' }) })
      return { text: 'Resultado simulado' }
    })
    const chamar = () => gerarConteudoComGemini({ input: 'Fictício' }, { cliente, controle, agora: () => instante })
    await assert.rejects(chamar, { code: 'GEMINI_SERVICE_LIMIT_REACHED' })
    instante = 89999
    await assert.rejects(chamar, (erro) => erro.code === 'GEMINI_COOLDOWN' && erro.details.retryAfterSeconds === 1)
    assert.equal(chamadas, 1)
    instante = 90000
    assert.equal((await chamar()).texto, 'Resultado simulado')
    assert.equal(chamadas, 2)
  })

  it('deve compartilhar o bloqueio de concorrência entre clientes sem liberar a chamada original', async () => {
    let terminar
    let chamadas = 0
    const controle = criarControleChamadasGemini({ agora: () => 0 })
    const primeiro = criarClienteSimulado(() => new Promise((resolve) => { terminar = resolve }))
    const segundo = criarClienteSimulado(async () => { chamadas += 1; return { text: 'Não deve ocorrer' } })
    const emCurso = gerarConteudoComGemini({ input: 'Fictício' }, { cliente: primeiro, controle })
    try {
      for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        await assert.rejects(() => gerarConteudoComGemini({ input: 'Outro fictício' }, { cliente: segundo, controle }), { code: 'GEMINI_REQUEST_IN_PROGRESS' })
      }
      assert.equal(chamadas, 0)
    } finally { terminar({ text: 'Concluída' }); await emCurso }
  })

  for (const status of [400, 404, 422]) {
    it(`deve identificar rejeição HTTP ${status} sem repetir nem expor o corpo externo`, async () => {
      let chamadas = 0
      const cliente = criarClienteSimulado(async () => { chamadas += 1; throw Object.assign(new Error('segredo de configuração'), { status }) })
      await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente }), (erro) => {
        assert.equal(erro.code, 'GEMINI_REQUEST_REJECTED')
        assert.deepEqual(erro.details, { statusExterno: status })
        assert.doesNotMatch(erro.message, /segredo/)
        return true
      })
      assert.equal(chamadas, 1)
    })
  }

  it('deve preservar HTTP 503 e RetryInfo, bloquear repetição e recuperar após espera', async () => {
    let instante = 0
    let chamadas = 0
    const controle = criarControleChamadasGemini({ agora: () => instante })
    const cliente = criarClienteSimulado(async () => {
      chamadas += 1
      if (chamadas === 1) throw Object.assign(new Error(JSON.stringify({ error: { code: 503, message: 'corpo privado', details: [
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '45.2s' },
      ] } })), { name: 'ApiError', status: 503 })
      return { text: 'Resposta fictícia válida' }
    })
    const chamar = () => gerarConteudoComGemini({ input: 'Fictício' }, { cliente, controle, agora: () => instante })
    await assert.rejects(chamar, (erro) => {
      assert.equal(erro.code, 'GEMINI_SERVICE_UNAVAILABLE')
      assert.deepEqual(erro.details, { statusExterno: 503, retryAfterSeconds: 46 })
      assert.doesNotMatch(JSON.stringify(erro), /corpo privado/)
      return true
    })
    instante = 45999
    await assert.rejects(chamar, { code: 'GEMINI_COOLDOWN' })
    assert.equal(chamadas, 1)
    instante = 46000
    assert.equal((await chamar()).texto, 'Resposta fictícia válida')
    assert.equal(chamadas, 2)
  })

  for (const codigo of ['ECONNRESET', 'ENOTFOUND', 'UND_ERR_CONNECT_TIMEOUT', 'segredo-injetado']) {
    it(`deve diagnosticar transporte ${codigo} usando somente lista positiva`, async () => {
      const cliente = criarClienteSimulado(async () => { throw new TypeError('fetch failed', { cause: { code: codigo, message: 'causa com segredo' } }) })
      await assert.rejects(() => gerarConteudoComGemini({ input: 'Fictício' }, { cliente }), (erro) => {
        assert.equal(erro.code, 'GEMINI_CONNECTION_FAILED')
        assert.deepEqual(erro.details, { statusExterno: null, codigoTransporte: codigo === 'segredo-injetado' ? 'unknown' : codigo, retryAfterSeconds: 30 })
        assert.doesNotMatch(JSON.stringify(erro), /segredo|fetch failed/)
        return true
      })
    })
  }
})
