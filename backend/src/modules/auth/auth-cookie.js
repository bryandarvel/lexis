import { env } from '../../config/env.js'

export const REFRESH_TOKEN_COOKIE_NAME =
  'lexis_refresh_token'

function criarOpcoesBaseCookie() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  }
}

export function criarOpcoesRefreshCookie(expiraEm) {
  return {
    ...criarOpcoesBaseCookie(),
    expires: expiraEm,
  }
}

export function criarOpcoesLimparRefreshCookie() {
  return criarOpcoesBaseCookie()
}