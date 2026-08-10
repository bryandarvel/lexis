let accessToken = null

export function obterAccessToken() {
  return accessToken
}

export function definirAccessToken(novoAccessToken) {
  if (
    typeof novoAccessToken !== 'string' ||
    novoAccessToken.length === 0
  ) {
    throw new TypeError(
      'O access token deve ser uma string não vazia.',
    )
  }

  accessToken = novoAccessToken
}

export function limparAccessToken() {
  accessToken = null
}