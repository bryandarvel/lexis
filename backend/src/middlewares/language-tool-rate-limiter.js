import { rateLimit } from 'express-rate-limit'

export const limitarRevisoesLinguisticas = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth.usuarioId,
  handler(_req, res, _next, options) {
    return res.status(options.statusCode).json({
      error: {
        code: 'LANGUAGETOOL_RATE_LIMIT_EXCEEDED',
        message:
          'Muitas revisões linguísticas. Aguarde um minuto e tente novamente.',
      },
    })
  },
})
