import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

export function errorHandler(error, _req, res, _next) {
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

  console.error(error)

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
      ...(env.NODE_ENV === 'development' && {
        details: error.message,
      }),
    },
  })
}