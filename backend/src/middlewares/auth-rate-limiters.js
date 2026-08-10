import {
  ipKeyGenerator,
  rateLimit,
} from 'express-rate-limit'

const QUINZE_MINUTOS_MS = 15 * 60 * 1000
const UMA_HORA_MS = 60 * 60 * 1000

function criarLimitador({
  windowMs,
  limite,
  mensagem,
  skipSuccessfulRequests = false,
  keyGenerator,
}) {
  return rateLimit({
    windowMs,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,

    ...(keyGenerator && {
      keyGenerator,
    }),

    handler(_req, res, _next, options) {
      return res.status(options.statusCode).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: mensagem,
        },
      })
    },
  })
}

function criarChaveLogin(req) {
  const enderecoIp =
    req.ip ??
    req.socket?.remoteAddress ??
    'ip-desconhecido'

  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : 'email-ausente'

  return `${ipKeyGenerator(enderecoIp)}:${email}`
}

export const limitarLogin = criarLimitador({
  windowMs: QUINZE_MINUTOS_MS,
  limite: 10,
  mensagem:
    'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
  skipSuccessfulRequests: true,
  keyGenerator: criarChaveLogin,
})

export const limitarCadastro = criarLimitador({
  windowMs: UMA_HORA_MS,
  limite: 50,
  mensagem:
    'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.',
})

export const limitarRefresh = criarLimitador({
  windowMs: QUINZE_MINUTOS_MS,
  limite: 60,
  mensagem:
    'Muitas tentativas de renovação de sessão. Faça login novamente mais tarde.',
  skipSuccessfulRequests: true,
})