import { rateLimit } from 'express-rate-limit'

const QUINZE_MINUTOS_MS = 15 * 60 * 1000

function criarChavePorAluno(req) {
  return req.auth.usuarioId
}

export const limitarOcr = rateLimit({
  windowMs: QUINZE_MINUTOS_MS,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: criarChavePorAluno,

  handler(_req, res, _next, options) {
    return res.status(options.statusCode).json({
      error: {
        code: 'OCR_RATE_LIMIT_EXCEEDED',
        message:
          'Muitas solicitações de transcrição. Aguarde alguns minutos e tente novamente.',
      },
    })
  },
})