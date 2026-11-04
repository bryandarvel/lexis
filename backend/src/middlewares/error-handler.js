import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { registrarEvento } from '../utils/operational-log.js'

function normalizarErroDoParser(error) {
  if (error instanceof AppError) return error
  if (error instanceof SyntaxError && error.type === 'entity.parse.failed' && error.status === 400) {
    return new AppError('O corpo da requisição contém JSON inválido.', {
      statusCode: 400, code: 'INVALID_JSON',
    })
  }
  if (error?.type === 'entity.too.large' && error.status === 413 &&
    error.expose === true && Number.isSafeInteger(error.limit) && error.limit > 0) {
    return new AppError('O corpo da requisição excede o limite permitido.', {
      statusCode: 413, code: 'PAYLOAD_TOO_LARGE',
    })
  }
  return error
}

export function errorHandler(error, req, res, _next) {
  error = normalizarErroDoParser(error)
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
