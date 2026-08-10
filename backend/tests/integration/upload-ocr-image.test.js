import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import express from 'express'
import request from 'supertest'

import { env } from '../../src/config/env.js'
import { errorHandler } from '../../src/middlewares/error-handler.js'
import {
  receberImagemOcr,
} from '../../src/middlewares/upload-ocr-image.js'

function criarImagemJpeg() {
  return Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
  ])
}

function criarImagemPng() {
  return Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0x00,
  ])
}

function criarAppDeTeste() {
  const app = express()

  app.post(
    '/upload',
    receberImagemOcr,
    (req, res) => {
      const arquivoRecebido = {
        nome: req.file.originalname,
        tipo: req.file.mimetype,
        tamanho: req.file.size,
        bufferPresente:
          Buffer.isBuffer(req.file.buffer),
      }

      req.file.buffer = undefined

      return res.status(200).json({
        data: {
          arquivo: arquivoRecebido,
        },
      })
    },
  )

  app.use(errorHandler)

  return app
}

describe('Middleware de upload para OCR', () => {
  it('deve aceitar uma imagem JPEG válida', async () => {
    const resposta = await request(criarAppDeTeste())
      .post('/upload')
      .attach(
        'imagem',
        criarImagemJpeg(),
        {
          filename: 'redacao.jpg',
          contentType: 'image/jpeg',
        },
      )
      .expect(200)

    assert.deepEqual(
      resposta.body.data.arquivo,
      {
        nome: 'redacao.jpg',
        tipo: 'image/jpeg',
        tamanho: 6,
        bufferPresente: true,
      },
    )
  })

  it('deve aceitar uma imagem PNG válida', async () => {
    const resposta = await request(criarAppDeTeste())
      .post('/upload')
      .attach(
        'imagem',
        criarImagemPng(),
        {
          filename: 'redacao.png',
          contentType: 'image/png',
        },
      )
      .expect(200)

    assert.equal(
      resposta.body.data.arquivo.tipo,
      'image/png',
    )
    assert.equal(
      resposta.body.data.arquivo.bufferPresente,
      true,
    )
  })

  it('deve exigir o campo imagem', async () => {
    const resposta = await request(criarAppDeTeste())
      .post('/upload')
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'OCR_IMAGE_REQUIRED',
    )
  })

  it('deve rejeitar formatos não permitidos', async () => {
    const resposta = await request(criarAppDeTeste())
      .post('/upload')
      .attach(
        'imagem',
        Buffer.from('arquivo de texto'),
        {
          filename: 'redacao.txt',
          contentType: 'text/plain',
        },
      )
      .expect(415)

    assert.equal(
      resposta.body.error.code,
      'OCR_IMAGE_TYPE_UNSUPPORTED',
    )
  })

  it('deve rejeitar uma imagem com assinatura inválida', async () => {
    const resposta = await request(criarAppDeTeste())
      .post('/upload')
      .attach(
        'imagem',
        Buffer.from('nao e uma imagem jpeg'),
        {
          filename: 'redacao.jpg',
          contentType: 'image/jpeg',
        },
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'OCR_IMAGE_INVALID',
    )
  })

  it('deve rejeitar imagens maiores que o limite', async () => {
    const imagemGrande = Buffer.alloc(
      env.OCR_MAX_FILE_SIZE_BYTES + 1,
    )

    imagemGrande[0] = 0xff
    imagemGrande[1] = 0xd8
    imagemGrande[2] = 0xff

    const resposta = await request(criarAppDeTeste())
      .post('/upload')
      .attach(
        'imagem',
        imagemGrande,
        {
          filename: 'redacao-grande.jpg',
          contentType: 'image/jpeg',
        },
      )
      .expect(413)

    assert.equal(
      resposta.body.error.code,
      'OCR_IMAGE_TOO_LARGE',
    )
    assert.equal(
      resposta.body.error.details.limiteBytes,
      env.OCR_MAX_FILE_SIZE_BYTES,
    )
  })

  it('deve rejeitar um nome de campo incorreto', async () => {
    const resposta = await request(criarAppDeTeste())
      .post('/upload')
      .attach(
        'arquivo',
        criarImagemJpeg(),
        {
          filename: 'redacao.jpg',
          contentType: 'image/jpeg',
        },
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'OCR_IMAGE_FIELD_INVALID',
    )
    assert.equal(
      resposta.body.error.details.campoEsperado,
      'imagem',
    )
    assert.equal(
      resposta.body.error.details.campoRecebido,
      'arquivo',
    )
  })
})