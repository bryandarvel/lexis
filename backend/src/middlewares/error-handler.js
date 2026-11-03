import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { registrarEvento } from '../utils/operational-log.js'

export function errorHandler(error, req, res, _next) {
  if (env.NODE_ENV !== 'test') registrarEvento('request_error', {
    requestId: req.requestId,
    status: error instanceof AppError ? error.statusCode : 500,
    codigo: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
    statusExterno: error instanceof AppError ? error.details?.statusExterno : undefined,
    retryAfterSeconds: error instanceof AppError ? error.details?.retryAfterSeconds : undefined,
    codigoTransporte: error instanceof AppError ? error.details?.codigoTransporte : undefined,
  })
  if (error instanceof AppError) {
    const espera = error.details?.retryAfterSeconds
    if (error.code.startsWith('GEMINI_') && Number.isSafeInteger(espera) && espera > 0) {
      res.set('Retry-After', String(espera))
    }
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && {
          details: error.details,
        }),
      },
    })
  }

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    },
  })
}
