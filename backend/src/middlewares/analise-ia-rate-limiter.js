import { rateLimit } from 'express-rate-limit'

const QUINZE_MINUTOS_MS = 15 * 60 * 1000

function criarChavePorProfessor(req) {
  return req.auth.usuarioId
}

export function criarLimitadorAnaliseIa({
  windowMs = QUINZE_MINUTOS_MS,
  limite = 5,
} = {}) {
  return rateLimit({
    windowMs,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: criarChavePorProfessor,

    handler(_req, res, _next, options) {
      const prazo = Number(res.getHeader('Retry-After'))
      const retryAfterSeconds = Number.isSafeInteger(prazo) && prazo > 0
        ? prazo : Math.max(1, Math.ceil(options.windowMs / 1000))
      res.set('Retry-After', String(retryAfterSeconds))
      return res.status(options.statusCode).json({
        error: {
          code: 'AI_ANALYSIS_RATE_LIMIT_EXCEEDED',
          message:
            'Muitas solicitações de análise. Aguarde alguns minutos e tente novamente.',
          details: { retryAfterSeconds },
        },
      })
    },
  })
}

export const limitarAnalisesIa =
  criarLimitadorAnaliseIa()
