export const EVENTO_SESSAO_EXPIRADA =
  'lexis:sessao-expirada'

let expiracaoNotificada = false

export function notificarSessaoExpirada() {
  if (
    expiracaoNotificada ||
    typeof globalThis.dispatchEvent !== 'function'
  ) {
    return
  }

  expiracaoNotificada = true
  globalThis.dispatchEvent(
    new CustomEvent(EVENTO_SESSAO_EXPIRADA),
  )
}

export function notificarSessaoRestaurada() {
  expiracaoNotificada = false
}
