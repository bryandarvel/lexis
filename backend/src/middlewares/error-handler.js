import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { registrarEvento } from '../utils/operational-log.js'

export function errorHandler(error, req, res, _next) {
  if (env.NODE_ENV !== 'test') registrarEvento('request_error', {
    requestId: req.requestId,
    status: error instanceof AppError ? error.statusCode : 500,
    codigo: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
  })
  if (error instanceof AppError) {
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
