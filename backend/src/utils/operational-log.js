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
  return registro
}

export function registrarEvento(evento, dados, escrever = console.info) {
  escrever(JSON.stringify(criarRegistroOperacional(evento, dados)))
}
