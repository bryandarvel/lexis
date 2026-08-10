import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

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
