import { AppError } from '../utils/app-error.js'
import {
  verificarAccessToken,
} from '../modules/auth/auth-token.service.js'

function criarErroAutenticacaoNecessaria() {
  return new AppError(
    'É necessário estar autenticado para acessar este recurso.',
    {
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    },
  )
}

export function autenticarAccessToken(req, _res, next) {
  const cabecalhoAutorizacao =
    req.headers.authorization

  if (typeof cabecalhoAutorizacao !== 'string') {
    return next(criarErroAutenticacaoNecessaria())
  }

  const partes = cabecalhoAutorizacao
    .trim()
    .split(/\s+/)

  const esquema = partes[0]
  const token = partes[1]

  const cabecalhoInvalido =
    partes.length !== 2 ||
    esquema.toLowerCase() !== 'bearer' ||
    !token

  if (cabecalhoInvalido) {
    return next(criarErroAutenticacaoNecessaria())
  }

  try {
    const payload = verificarAccessToken(token)

    req.auth = {
      usuarioId: payload.sub,
      papel: payload.papel,
    }

    return next()
  } catch (error) {
    return next(error)
  }
}