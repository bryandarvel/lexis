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
    autenticarAccessToken,
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
   *         description: Limite de solicitações de análise excedido
   *       '502':
   *         description: Resposta inválida ou falha do serviço de IA
   *       '503':
   *         description: Gemini não configurado, indisponível ou com limite externo atingido
   *       '504':
   *         description: Tempo limite do Gemini excedido
   */
  router.post(
    '/redacoes/:redacaoId/analises-ia',
    autenticarAccessToken,
    somenteProfessor,
    validarParams(analiseIaParamsSchema),
    limitador,
    controller,
  )

  return router
}

export const analisesIaRouter =
  criarAnalisesIaRouter()
