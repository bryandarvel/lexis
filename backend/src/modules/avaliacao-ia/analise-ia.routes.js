import { Router } from 'express'

import {
  limitarAnalisesIa,
} from '../../middlewares/analise-ia-rate-limiter.js'
import {
  autenticarAccessToken,
} from '../../middlewares/authenticate-access-token.js'
import {
  autorizarPapeis,
} from '../../middlewares/authorize-roles.js'
import {
  validarParams,
} from '../../middlewares/validate-request.js'

import {
  criarListarAnalisesIaController,
  criarSolicitarAnaliseIaController,
} from './analise-ia.controller.js'
import {
  analiseIaParamsSchema,
} from './analise-ia.schemas.js'
import {
  listarAnalisesIaParaProfessor,
  solicitarAnaliseIaParaProfessor,
} from './analise-ia.service.js'

const somenteProfessor = autorizarPapeis('PROFESSOR')

export function criarAnalisesIaRouter({
  autenticar = autenticarAccessToken,
  solicitarAnalise =
    solicitarAnaliseIaParaProfessor,
  listarAnalises =
    listarAnalisesIaParaProfessor,
  limitador = limitarAnalisesIa,
} = {}) {
  const router = Router()
  const controller =
    criarSolicitarAnaliseIaController({
      solicitarAnalise,
    })
  const listarController =
    criarListarAnalisesIaController({
      listarAnalises,
    })

  /**
   * @openapi
   * /api/redacoes/{redacaoId}/analises-ia:
   *   get:
   *     summary: Lista o histórico de análises por IA
   *     description: Retorna todas as tentativas de análise da redação, da mais recente para a mais antiga, incluindo conclusões e erros controlados.
   *     tags:
   *       - Avaliação por IA
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: redacaoId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       '200':
   *         description: Histórico de análises da redação
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para professores
   *       '404':
   *         description: Redação indisponível para o professor
   *       '422':
   *         description: Identificador inválido
   */
  router.get(
    '/redacoes/:redacaoId/analises-ia',
    autenticar,
    somenteProfessor,
    validarParams(analiseIaParamsSchema),
    listarController,
  )

  /**
   * @openapi
   * /api/redacoes/{redacaoId}/analises-ia:
   *   post:
   *     summary: Solicita uma análise da redação por IA
   *     description: Cria uma nova análise estruturada e consultiva para apoiar a avaliação do professor responsável. A nota e o feedback final continuam sendo exclusivamente humanos.
   *     tags:
   *       - Avaliação por IA
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: redacaoId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       '201':
   *         description: Análise concluída e armazenada
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para professores
   *       '404':
   *         description: Redação indisponível para o professor
   *       '409':
   *         description: Critérios ausentes ou análise já em processamento
   *       '422':
   *         description: Identificador ou redação inválida
   *       '429':
   *         description: Limite local de solicitações por professor excedido (AI_ANALYSIS_RATE_LIMIT_EXCEEDED). Inclui Retry-After e error.details.retryAfterSeconds para aguardar a renovação dessa janela, sem chamar o Gemini.
   *       '502':
   *         description: Resposta inválida, indisponibilidade externa (GEMINI_SERVICE_UNAVAILABLE), conexão interrompida (GEMINI_CONNECTION_FAILED) ou solicitação recusada por configuração (GEMINI_REQUEST_REJECTED). Erros de conexão/indisponibilidade temporária incluem Retry-After e details.retryAfterSeconds. details.statusExterno identifica o HTTP do provedor quando conhecido; details.codigoTransporte usa lista positiva, sem mensagem bruta.
   *       '503':
   *         description: Gemini não configurado, com limite externo, em espera local ou com outra chamada em andamento. Códigos GEMINI_RATE_LIMITED (taxa), GEMINI_DAILY_QUOTA_EXCEEDED (diária), GEMINI_SERVICE_LIMIT_REACHED (cota não identificada), GEMINI_COOLDOWN e GEMINI_REQUEST_IN_PROGRESS. Sem repetição automática.
   *         headers:
   *           Retry-After:
   *             description: Espera mínima em segundos quando informada. Não garante a liberação da cota do Google.
   *             schema:
   *               type: integer
   *               minimum: 1
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     code:
   *                       type: string
   *                     message:
   *                       type: string
   *                     details:
   *                       type: object
   *                       properties:
   *                         retryAfterSeconds:
   *                           type: integer
   *                           minimum: 1
   *                         statusExterno:
   *                           type: integer
   *                           enum: [429]
   *                         codigoProvedor:
   *                           type: string
   *                           enum: [rate_limit_exceeded, too_many_requests, quota_exceeded, unknown]
   *       '504':
   *         description: Tempo limite do Gemini excedido, com Retry-After e details.retryAfterSeconds para aguardar antes de uma nova solicitação manual.
   */
  router.post(
    '/redacoes/:redacaoId/analises-ia',
    autenticar,
    somenteProfessor,
    validarParams(analiseIaParamsSchema),
    limitador,
    controller,
  )

  return router
}

export const analisesIaRouter =
  criarAnalisesIaRouter()
