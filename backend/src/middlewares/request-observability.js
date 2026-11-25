import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { registrarEvento } from '../utils/operational-log.js'

export function criarObservabilidadeRequisicao({ registrar = registrarEvento, habilitado = true } = {}) {
  return (req, res, next) => {
    // Não aceitar identificadores arbitrários enviados pelo cliente.
    req.requestId = randomUUID()
    res.setHeader('X-Request-Id', req.requestId)
    const inicio = performance.now()
    res.once('finish', () => {
      if (habilitado) registrar('http_request', { requestId: req.requestId, metodo: req.method, status: res.statusCode, duracaoMs: performance.now() - inicio })
    })
    next()
  }
}
