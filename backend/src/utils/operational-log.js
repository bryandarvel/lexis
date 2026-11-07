const eventos = new Set(['http_request', 'request_error', 'database_error', 'database_warning'])
const metodos = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])

// Lista positiva: nunca serializar o erro, request, corpo, URL, headers ou usuário.
export function criarRegistroOperacional(evento, dados = {}, agora = new Date()) {
  const registro = { evento: eventos.has(evento) ? evento : 'request_error', instante: agora.toISOString() }
  if (typeof dados.requestId === 'string' && /^[0-9a-f-]{36}$/.test(dados.requestId)) registro.requestId = dados.requestId
  if (metodos.has(dados.metodo)) registro.metodo = dados.metodo
  if (Number.isInteger(dados.status) && dados.status >= 100 && dados.status <= 599) registro.status = dados.status
  if (Number.isFinite(dados.duracaoMs) && dados.duracaoMs >= 0) registro.duracaoMs = Math.round(dados.duracaoMs)
  if (typeof dados.codigo === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(dados.codigo)) registro.codigo = dados.codigo
  if (evento === 'request_error' && registro.codigo?.startsWith('GEMINI_')) {
    if (Number.isInteger(dados.statusExterno) && dados.statusExterno >= 400 && dados.statusExterno <= 599) registro.statusExterno = dados.statusExterno
    if (Number.isSafeInteger(dados.retryAfterSeconds) && dados.retryAfterSeconds > 0) registro.retryAfterSeconds = dados.retryAfterSeconds
    if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET', 'unknown'].includes(dados.codigoTransporte)) registro.codigoTransporte = dados.codigoTransporte
  }
  return registro
}

export function registrarEvento(evento, dados, escrever = console.info) {
  escrever(JSON.stringify(criarRegistroOperacional(evento, dados)))
}
