import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  extrairTextoComOcrSpace,
} from '../../src/integrations/ocrSpace.client.js'

const arquivo = {
  buffer: Buffer.from('imagem-simulada'),
  mimetype: 'image/jpeg',
  nomeArquivo: 'redacao.jpg',
}

function criarRespostaJson(
  corpo,
  {
    ok = true,
    status = 200,
  } = {},
) {
  return {
    ok,
    status,
    json: async () => corpo,
  }
}

describe('Cliente OCR.space', () => {
  it('deve enviar a imagem e retornar o texto extraído', async () => {
    let chamadaRecebida

    const fetchImpl = async (url, opcoes) => {
      chamadaRecebida = {
        url,
        opcoes,
      }

      return criarRespostaJson({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ProcessingTimeInMilliseconds: '125',
        ParsedResults: [
          {
            ParsedText:
              '  Texto extraído da redação.  ',
          },
        ],
      })
    }

    const resultado = await extrairTextoComOcrSpace(
      arquivo,
      {
        fetchImpl,
        apiKey: 'chave-de-teste',
      },
    )

    assert.equal(
      resultado.texto,
      'Texto extraído da redação.',
    )
    assert.equal(resultado.codigoSaida, 1)
    assert.equal(resultado.tempoProcessamentoMs, '125')

    assert.equal(
      chamadaRecebida.url,
      'https://api.ocr.space/parse/image',
    )
    assert.equal(
      chamadaRecebida.opcoes.method,
      'POST',
    )
    assert.equal(
      chamadaRecebida.opcoes.headers.apikey,
      'chave-de-teste',
    )

    const formulario = chamadaRecebida.opcoes.body
    const imagem = formulario.get('file')

    assert.equal(imagem.name, 'redacao.jpg')
    assert.equal(imagem.type, 'image/jpeg')
    assert.equal(formulario.get('language'), 'por')
    assert.equal(formulario.get('OCREngine'), '3')
    assert.equal(
      formulario.get('isOverlayRequired'),
      'false',
    )
    assert.equal(
      formulario.get('detectOrientation'),
      'true',
    )
    assert.equal(formulario.get('scale'), 'true')
  })

  it('deve rejeitar quando a integração não estiver configurada', async () => {
    await assert.rejects(
      () =>
        extrairTextoComOcrSpace(
          arquivo,
          {
            apiKey: '',
            fetchImpl: async () => {
              throw new Error(
                'Não deveria ser executado.',
              )
            },
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 503)
        assert.equal(erro.code, 'OCR_NOT_CONFIGURED')

        return true
      },
    )
  })

  it('deve rejeitar uma imagem que não pôde ser processada', async () => {
    const fetchImpl = async () =>
      criarRespostaJson({
        OCRExitCode: 3,
        IsErroredOnProcessing: true,
        ParsedResults: [],
      })

    await assert.rejects(
      () =>
        extrairTextoComOcrSpace(
          arquivo,
          {
            fetchImpl,
            apiKey: 'chave-de-teste',
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 422)
        assert.equal(
          erro.code,
          'OCR_PROCESSING_FAILED',
        )
        assert.equal(
          erro.details.codigoSaida,
          3,
        )

        return true
      },
    )
  })

  it('deve rejeitar quando nenhum texto for encontrado', async () => {
    const fetchImpl = async () =>
      criarRespostaJson({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ParsedResults: [
          {
            ParsedText: '   ',
          },
        ],
      })

    await assert.rejects(
      () =>
        extrairTextoComOcrSpace(
          arquivo,
          {
            fetchImpl,
            apiKey: 'chave-de-teste',
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 422)
        assert.equal(
          erro.code,
          'OCR_TEXT_NOT_FOUND',
        )

        return true
      },
    )
  })

  it('deve informar quando o limite externo for atingido', async () => {
    const fetchImpl = async () =>
      criarRespostaJson(
        {},
        {
          ok: false,
          status: 429,
        },
      )

    await assert.rejects(
      () =>
        extrairTextoComOcrSpace(
          arquivo,
          {
            fetchImpl,
            apiKey: 'chave-de-teste',
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 503)
        assert.equal(
          erro.code,
          'OCR_SERVICE_LIMIT_REACHED',
        )

        return true
      },
    )
  })

  it('deve transformar timeout em erro estruturado', async () => {
    const fetchImpl = async () => {
      const erro = new Error('Tempo excedido')
      erro.name = 'TimeoutError'

      throw erro
    }

    await assert.rejects(
      () =>
        extrairTextoComOcrSpace(
          arquivo,
          {
            fetchImpl,
            apiKey: 'chave-de-teste',
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 504)
        assert.equal(erro.code, 'OCR_TIMEOUT')

        return true
      },
    )
  })

  it('deve transformar falha de rede em erro estruturado', async () => {
    const fetchImpl = async () => {
      throw new Error('Falha de rede simulada')
    }

    await assert.rejects(
      () =>
        extrairTextoComOcrSpace(
          arquivo,
          {
            fetchImpl,
            apiKey: 'chave-de-teste',
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 502)
        assert.equal(
          erro.code,
          'OCR_SERVICE_UNAVAILABLE',
        )

        return true
      },
    )
  })
})