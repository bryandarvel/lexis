import { Router } from 'express'

import {
  autenticarAccessToken,
} from '../../middlewares/authenticate-access-token.js'
import {
  autorizarPapeis,
} from '../../middlewares/authorize-roles.js'
import {
  validarBody,
  validarParams,
} from '../../middlewares/validate-request.js'

import {
  criarConsultarFeedbackAlunoController,
  criarConsultarFeedbackController,
  criarPublicarFeedbackController,
  criarSalvarFeedbackRascunhoController,
} from './feedbacks.controller.js'
import {
  feedbackParamsSchema,
  salvarFeedbackRascunhoSchema,
} from './feedbacks.schemas.js'
import {
  consultarFeedbackParaProfessor,
  consultarFeedbackPublicadoParaAluno,
  publicarFeedbackParaProfessor,
  salvarFeedbackRascunhoParaProfessor,
} from './feedbacks.service.js'

const somenteProfessor = autorizarPapeis('PROFESSOR')
const somenteAluno = autorizarPapeis('ALUNO')

export function criarFeedbacksRouter({
  consultarFeedbackAluno =
    consultarFeedbackPublicadoParaAluno,
  consultarFeedback =
    consultarFeedbackParaProfessor,
  publicarFeedback =
    publicarFeedbackParaProfessor,
  salvarFeedback =
    salvarFeedbackRascunhoParaProfessor,
} = {}) {
  const router = Router()
  const consultarAlunoController =
    criarConsultarFeedbackAlunoController({
      consultarFeedback: consultarFeedbackAluno,
    })
  const consultarController =
    criarConsultarFeedbackController({
      consultarFeedback,
    })
  const publicarController =
    criarPublicarFeedbackController({
      publicarFeedback,
    })
  const salvarController =
    criarSalvarFeedbackRascunhoController({
      salvarFeedback,
    })

  /**
   * @openapi
   * /api/aluno/redacoes/{redacaoId}/feedback:
   *   get:
   *     summary: Consulta a correção publicada do aluno
   *     description: Retorna exclusivamente a versão publicada da correção de uma redação pertencente ao aluno autenticado. Rascunhos e versões substituídas permanecem privados.
   *     tags:
   *       - Feedbacks
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
   *         description: Correção publicada encontrada
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para alunos
   *       '404':
   *         description: Redação inexistente ou correção ainda indisponível
   *       '422':
   *         description: Identificador inválido
   */
  router.get(
    '/aluno/redacoes/:redacaoId/feedback',
    autenticarAccessToken,
    somenteAluno,
    validarParams(feedbackParamsSchema),
    consultarAlunoController,
  )

  /**
   * @openapi
   * /api/redacoes/{redacaoId}/feedback:
   *   get:
   *     summary: Consulta a correção da redação
   *     description: Retorna a versão atual e o histórico completo do feedback humano, da versão mais recente para a mais antiga. Retorna feedback nulo quando a redação ainda não possui correção.
   *     tags:
   *       - Feedbacks
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
   *         description: Feedback e histórico consultados
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
    '/redacoes/:redacaoId/feedback',
    autenticarAccessToken,
    somenteProfessor,
    validarParams(feedbackParamsSchema),
    consultarController,
  )

  /**
   * @openapi
   * /api/redacoes/{redacaoId}/feedback:
   *   put:
   *     summary: Salva o rascunho da correção
   *     description: Cria ou atualiza a versão de rascunho do feedback humano. Não publica a nota nem os comentários para o aluno.
   *     tags:
   *       - Feedbacks
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: redacaoId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             additionalProperties: false
   *             required:
   *               - nota
   *               - comentarioGeral
   *               - criterios
   *             properties:
   *               nota:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 1000
   *                 nullable: true
   *               comentarioGeral:
   *                 type: string
   *                 nullable: true
   *               criterios:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required:
   *                     - criterioId
   *                     - comentario
   *                   properties:
   *                     criterioId:
   *                       type: string
   *                       format: uuid
   *                     comentario:
   *                       type: string
   *     responses:
   *       '200':
   *         description: Rascunho salvo
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para professores
   *       '404':
   *         description: Redação indisponível para o professor
   *       '422':
   *         description: Dados ou critérios inválidos
   */
  router.put(
    '/redacoes/:redacaoId/feedback',
    autenticarAccessToken,
    somenteProfessor,
    validarParams(feedbackParamsSchema),
    validarBody(salvarFeedbackRascunhoSchema),
    salvarController,
  )

  /**
   * @openapi
   * /api/redacoes/{redacaoId}/feedback/publicar:
   *   post:
   *     summary: Publica a correção da redação
   *     description: Publica o rascunho completo, marca a redação como avaliada e cria uma notificação para o aluno. Comentários por critério são opcionais.
   *     tags:
   *       - Feedbacks
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
   *         description: Feedback publicado e notificação criada
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para professores
   *       '404':
   *         description: Redação indisponível para o professor
   *       '409':
   *         description: Rascunho inexistente
   *       '422':
   *         description: Identificador inválido ou rascunho incompleto
   */
  router.post(
    '/redacoes/:redacaoId/feedback/publicar',
    autenticarAccessToken,
    somenteProfessor,
    validarParams(feedbackParamsSchema),
    publicarController,
  )

  return router
}

export const feedbacksRouter = criarFeedbacksRouter()
