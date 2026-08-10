import multer from 'multer'

import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
])

function criarErroImagemObrigatoria() {
  return new AppError(
    'Envie uma imagem da redação no campo imagem.',
    {
      statusCode: 422,
      code: 'OCR_IMAGE_REQUIRED',
    },
  )
}

function criarErroTipoNaoPermitido() {
  return new AppError(
    'Envie uma imagem no formato JPEG ou PNG.',
    {
      statusCode: 415,
      code: 'OCR_IMAGE_TYPE_UNSUPPORTED',
    },
  )
}

function criarErroImagemInvalida() {
  return new AppError(
    'O conteúdo enviado não corresponde a uma imagem JPEG ou PNG válida.',
    {
      statusCode: 422,
      code: 'OCR_IMAGE_INVALID',
    },
  )
}

function criarErroImagemMuitoGrande() {
  return new AppError(
    'A imagem deve possuir no máximo 1 MB.',
    {
      statusCode: 413,
      code: 'OCR_IMAGE_TOO_LARGE',
      details: {
        limiteBytes: env.OCR_MAX_FILE_SIZE_BYTES,
      },
    },
  )
}

function criarErroCampoInesperado(campo) {
  return new AppError(
    'O arquivo deve ser enviado exclusivamente no campo imagem.',
    {
      statusCode: 422,
      code: 'OCR_IMAGE_FIELD_INVALID',
      details: {
        campoRecebido: campo ?? null,
        campoEsperado: 'imagem',
      },
    },
  )
}

function criarErroUpload() {
  return new AppError(
    'Não foi possível receber a imagem enviada.',
    {
      statusCode: 400,
      code: 'OCR_UPLOAD_ERROR',
    },
  )
}

function possuiAssinaturaJpeg(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
}

function possuiAssinaturaPng(buffer) {
  const assinatura = [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]

  return (
    buffer.length >= assinatura.length &&
    assinatura.every(
      (byte, indice) => buffer[indice] === byte,
    )
  )
}

function assinaturaCompativel(arquivo) {
  if (arquivo.mimetype === 'image/jpeg') {
    return possuiAssinaturaJpeg(arquivo.buffer)
  }

  if (arquivo.mimetype === 'image/png') {
    return possuiAssinaturaPng(arquivo.buffer)
  }

  return false
}

function descartarBuffer(req) {
  if (req.file) {
    req.file.buffer = undefined
  }
}

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    files: 1,
    fileSize: env.OCR_MAX_FILE_SIZE_BYTES,
  },

  fileFilter(_req, arquivo, callback) {
    if (!TIPOS_PERMITIDOS.has(arquivo.mimetype)) {
      return callback(criarErroTipoNaoPermitido())
    }

    return callback(null, true)
  },
})

function tratarErroMulter(erro) {
  if (!(erro instanceof multer.MulterError)) {
    return erro
  }

  if (erro.code === 'LIMIT_FILE_SIZE') {
    return criarErroImagemMuitoGrande()
  }

  if (erro.code === 'LIMIT_UNEXPECTED_FILE') {
    return criarErroCampoInesperado(erro.field)
  }

  return criarErroUpload()
}

export function receberImagemOcr(req, res, next) {
  upload.single('imagem')(req, res, (erro) => {
    if (erro) {
      descartarBuffer(req)

      return next(tratarErroMulter(erro))
    }

    if (!req.file) {
      return next(criarErroImagemObrigatoria())
    }

    if (!assinaturaCompativel(req.file)) {
      descartarBuffer(req)

      return next(criarErroImagemInvalida())
    }

    return next()
  })
}