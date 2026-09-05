import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'

import { authRouter } from './modules/auth/auth.routes.js'
import { turmasRouter } from './modules/turmas/turmas.routes.js'
import { temasRouter } from './modules/temas/temas.routes.js'
import { redacoesRouter } from './modules/redacoes/redacoes.routes.js'
import { analisesIaRouter } from './modules/avaliacao-ia/analise-ia.routes.js'
import { feedbacksRouter } from './modules/feedbacks/feedbacks.routes.js'
import { notificacoesRouter } from './modules/notificacoes/notificacoes.routes.js'

import { errorHandler } from './middlewares/error-handler.js'
import { notFoundHandler } from './middlewares/not-found-handler.js'

import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { swaggerSpec } from './docs/swagger.js'

export const app = express()

app.disable('x-powered-by')

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
)

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'))
}

app.get('/', (_req, res) => {
  return res.redirect('/api-docs')
})

app.get('/api-docs.json', (_req, res) => {
  return res.status(200).json(swaggerSpec)
})

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'LÉXIS API - Documentação',
  }),
)

app.use('/api/auth', authRouter)
app.use('/api/turmas', turmasRouter)
app.use('/api', temasRouter)
app.use('/api', redacoesRouter)
app.use('/api', analisesIaRouter)
app.use('/api', feedbacksRouter)
app.use('/api', notificacoesRouter)

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Verifica a disponibilidade da API
 *     description: Confirma se a API está ativa e se consegue acessar o banco de dados.
 *     tags:
 *       - Infraestrutura
 *     responses:
 *       '200':
 *         description: API e banco de dados disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: lexis-api
 *                 database:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       '503':
 *         description: O banco de dados está indisponível
 */
  
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1')

    return res.status(200).json({
      status: 'ok',
      service: 'lexis-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return res.status(503).json({
      status: 'error',
      service: 'lexis-api',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    })
  }
})

app.use(notFoundHandler)
app.use(errorHandler)
