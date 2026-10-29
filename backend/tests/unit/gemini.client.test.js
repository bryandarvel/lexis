import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { describe, it } from 'node:test'

import { GoogleGenAI } from '@google/genai'

import {
  gerarConteudoComGemini,
} from '../../src/integrations/gemini.client.js'

function criarClienteSimulado(implementacao) {
  return {
    interactions: {
      create: implementacao,
    },
  }
}

describe('Cliente Google Gemini', () => {
  it('deve criar uma interação sem armazenamento e retornar o texto', async () => {
    let chamadaRecebida

    const cliente = criarClienteSimulado(
      async (parametros, opcoes) => {
        chamadaRecebida = {
          parametros,
          opcoes,
        }

        return {
          id: 'interacao-1',
          status: 'completed',
          output_text: '  LEXIS_GEMINI_OK  ',
          usage: {
            total_tokens: 12,
          },
        }
      },
    )

    const responseFormat = {
      type: 'json_schema',
      name: 'resposta_teste',
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
        input: 'Conteúdo de teste',
        store: false,
        system_instruction: 'Instrução de teste',
        response_format: responseFormat,
        generation_config: {
          temperature: 0.2,
        },
      },
    )
    assert.deepEqual(
      chamadaRecebida.opcoes,
      {
        timeout_ms: 45000,
        retries: {
          strategy: 'none',
        },
      },
    )
    assert.deepEqual(resultado, {
      texto: 'LEXIS_GEMINI_OK',
      interacaoId: 'interacao-1',
      status: 'completed',
      uso: {
        total_tokens: 12,
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
        id: 'interacao-vazia',
        status: 'completed',
        output_text: '   ',
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
})

// O SDK real aponta para um servidor HTTP em 127.0.0.1: nada sai da máquina.
async function iniciarServidorLocal(responder) {
  const servidor = http.createServer((requisicao, resposta) => {
    servidor.requisicoes += 1
    requisicao.resume()
    responder(resposta)
  })

  servidor.requisicoes = 0
  await new Promise((resolver) =>
    servidor.listen(0, '127.0.0.1', resolver),
  )

  return servidor
}

function responderJson(status, corpo) {
  return (resposta) => {
    resposta.writeHead(status, {
      'content-type': 'application/json',
    })
    resposta.end(JSON.stringify(corpo))
  }
}

function criarClienteLocal(porta) {
  return new GoogleGenAI({
    apiKey: 'chave-local-de-teste',
    httpOptions: {
      baseUrl: `http://127.0.0.1:${porta}`,
    },
  })
}

async function chamarClienteLocal(porta) {
  return gerarConteudoComGemini(
    {
      input: 'Texto fictício de teste.',
    },
    {
      cliente: criarClienteLocal(porta),
      model: 'modelo-local',
      timeoutMs: 10000,
    },
  )
}

async function obterPortaFechada() {
  const servidor = net.createServer()

  await new Promise((resolver) =>
    servidor.listen(0, '127.0.0.1', resolver),
  )

  const { port } = servidor.address()

  await new Promise((resolver) => servidor.close(resolver))

  return port
}

describe('Cliente Google Gemini sem repetições automáticas do SDK', () => {
  for (const [status, codigo, statusCode] of [
    [429, 'GEMINI_SERVICE_LIMIT_REACHED', 503],
    [503, 'GEMINI_SERVICE_UNAVAILABLE', 502],
  ]) {
    it(`deve fazer uma única requisição diante de HTTP ${status}`, async () => {
      const servidor = await iniciarServidorLocal(
        responderJson(status, {
          error: {
            code: status,
            message: 'Resposta simulada.',
          },
        }),
      )

      try {
        await assert.rejects(
          () => chamarClienteLocal(servidor.address().port),
          (erro) => {
            assert.equal(erro.statusCode, statusCode)
            assert.equal(erro.code, codigo)

            return true
          },
        )
        assert.equal(servidor.requisicoes, 1)
      } finally {
        servidor.close()
      }
    })
  }

  it('deve fazer uma única tentativa diante de falha de rede', async () => {
    const porta = await obterPortaFechada()
    const fetchOriginal = globalThis.fetch
    let tentativas = 0

    globalThis.fetch = (...argumentos) => {
      tentativas += 1

      return fetchOriginal(...argumentos)
    }

    try {
      await assert.rejects(
        () => chamarClienteLocal(porta),
        (erro) => {
          assert.equal(erro.statusCode, 502)
          assert.equal(
            erro.code,
            'GEMINI_SERVICE_UNAVAILABLE',
          )

          return true
        },
      )
      assert.equal(tentativas, 1)
    } finally {
      globalThis.fetch = fetchOriginal
    }
  })

  it('deve manter o caminho de sucesso com uma única requisição', async () => {
    const servidor = await iniciarServidorLocal(
      responderJson(200, {
        id: 'interacao-local',
        status: 'completed',
        steps: [
          {
            type: 'model_output',
            content: [
              {
                type: 'text',
                text: '  RESPOSTA_LOCAL  ',
              },
            ],
          },
        ],
      }),
    )

    try {
      const resultado = await chamarClienteLocal(
        servidor.address().port,
      )

      assert.equal(resultado.texto, 'RESPOSTA_LOCAL')
      assert.equal(resultado.interacaoId, 'interacao-local')
      assert.equal(resultado.status, 'completed')
      assert.equal(servidor.requisicoes, 1)
    } finally {
      servidor.close()
    }
  })
})
