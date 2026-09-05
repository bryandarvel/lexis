import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  revisarTextoComLanguageTool,
} from '../../src/integrations/languageTool.client.js'

function respostaJson(
  corpo,
  { ok = true, status = 200 } = {},
) {
  return {
    ok,
    status,
    json: async () => corpo,
  }
}

describe('Cliente LanguageTool', () => {
  it('envia texto por POST e normaliza sugestões com posição', async () => {
    let chamada
    const texto = 'Ele vai vim amanhã.'
    const fetchImpl = async (url, opcoes) => {
      chamada = { url, opcoes }

      return respostaJson({
        software: { version: '6.6' },
        language: { code: 'pt-BR' },
        matches: [
          {
            message: 'Use a forma verbal adequada.',
            shortMessage: 'Forma verbal',
            offset: 8,
            length: 3,
            replacements: [
              { value: 'vir' },
              { value: 'chegar' },
            ],
            context: { text: texto },
            rule: {
              id: 'REGRA_TESTE',
              category: { name: 'Gramática' },
            },
          },
        ],
      })
    }

    const resultado =
      await revisarTextoComLanguageTool(
        { texto },
        {
          fetchImpl,
          enabled: true,
          apiUrl: 'http://127.0.0.1:8010/v2/check',
          language: 'pt-BR',
          timeoutMs: 1000,
        },
      )

    assert.equal(chamada.opcoes.method, 'POST')
    assert.equal(chamada.opcoes.body.get('text'), texto)
    assert.equal(chamada.opcoes.body.get('language'), 'pt-BR')
    assert.equal(resultado.disponivel, true)
    assert.equal(resultado.sugestoes[0].trecho, 'vim')
    assert.deepEqual(
      resultado.sugestoes[0].substituicoes,
      ['vir', 'chegar'],
    )
  })

  it('permanece inerte quando a integração está desativada', async () => {
    const resultado =
      await revisarTextoComLanguageTool(
        { texto: 'Texto.' },
        {
          enabled: false,
          fetchImpl: async () => {
            throw new Error('Não deveria chamar a rede.')
          },
        },
      )

    assert.deepEqual(resultado, {
      disponivel: false,
      status: 'DESATIVADO',
      sugestoes: [],
    })
  })

  it('transforma timeout em erro controlado', async () => {
    await assert.rejects(
      () =>
        revisarTextoComLanguageTool(
          { texto: 'Texto.' },
          {
            enabled: true,
            fetchImpl: async () => {
              const erro = new Error('timeout')
              erro.name = 'TimeoutError'
              throw erro
            },
          },
        ),
      (erro) => {
        assert.equal(erro.code, 'LANGUAGETOOL_TIMEOUT')
        return true
      },
    )
  })

  it('transforma limite externo em erro controlado', async () => {
    await assert.rejects(
      () =>
        revisarTextoComLanguageTool(
          { texto: 'Texto.' },
          {
            enabled: true,
            fetchImpl: async () =>
              respostaJson({}, { ok: false, status: 429 }),
          },
        ),
      (erro) => {
        assert.equal(
          erro.code,
          'LANGUAGETOOL_LIMIT_REACHED',
        )
        return true
      },
    )
  })
})
