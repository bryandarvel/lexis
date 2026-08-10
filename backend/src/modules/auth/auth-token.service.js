import {
  createHash,
  randomUUID,
} from 'node:crypto'

import jwt from 'jsonwebtoken'

import { env } from '../../config/env.js'
import { AppError } from '../../utils/app-error.js'

const EMISSOR_TOKEN = 'lexis-api'
const PUBLICO_TOKEN = 'lexis-web'

function verificarToken({
  token,
  segredo,
  tipoEsperado,
  codigoErro,
  mensagemErro,
}) {
  try {
    const payload = jwt.verify(token, segredo, {
      issuer: EMISSOR_TOKEN,
      audience: PUBLICO_TOKEN,
    })

    if (
      typeof payload !== 'object' ||
      payload.tipo !== tipoEsperado ||
      typeof payload.sub !== 'string'
    ) {
      throw new Error('Payload do token inválido.')
    }

    return payload
  } catch {
    throw new AppError(mensagemErro, {
      statusCode: 401,
      code: codigoErro,
    })
  }
}

export function criarAccessToken({ usuarioId, papel }) {
  return jwt.sign(
    {
      tipo: 'access',
      papel,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: usuarioId,
      issuer: EMISSOR_TOKEN,
      audience: PUBLICO_TOKEN,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      jwtid: randomUUID(),
    },
  )
}

export function criarRefreshToken({ usuarioId, familiaId }) {
  return jwt.sign(
    {
      tipo: 'refresh',
      familiaId,
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: usuarioId,
      issuer: EMISSOR_TOKEN,
      audience: PUBLICO_TOKEN,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      jwtid: randomUUID(),
    },
  )
}

export function verificarAccessToken(token) {
  return verificarToken({
    token,
    segredo: env.JWT_ACCESS_SECRET,
    tipoEsperado: 'access',
    codigoErro: 'ACCESS_TOKEN_INVALID',
    mensagemErro: 'Token de acesso inválido ou expirado.',
  })
}

export function verificarRefreshToken(token) {
  const payload = verificarToken({
    token,
    segredo: env.JWT_REFRESH_SECRET,
    tipoEsperado: 'refresh',
    codigoErro: 'REFRESH_TOKEN_INVALID',
    mensagemErro: 'Token de renovação inválido ou expirado.',
  })

  if (typeof payload.familiaId !== 'string') {
    throw new AppError(
      'Token de renovação inválido ou expirado.',
      {
        statusCode: 401,
        code: 'REFRESH_TOKEN_INVALID',
      },
    )
  }

  return payload
}

export function criarHashToken(token) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

export function obterExpiracaoToken(token) {
  const payload = jwt.decode(token)

  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof payload.exp !== 'number'
  ) {
    throw new AppError('Token sem expiração válida.', {
      statusCode: 500,
      code: 'TOKEN_EXPIRATION_INVALID',
    })
  }

  return new Date(payload.exp * 1000)
}