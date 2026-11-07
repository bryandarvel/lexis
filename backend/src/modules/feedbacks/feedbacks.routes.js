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

/**
 * @openapi
 * components:
 *   schemas:
 *     FeedbackTrechoPublicado:
 *       type: object
 *       additionalProperties: false
 *       required: [id, inicio, fim, trecho, sugeridoPorIa]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         inicio:
 *           type: integer
 *           minimum: 0
 *         fim:
 *           type: integer
 *           minimum: 1
 *         trecho:
 *           type: string
 *         sugeridoPorIa:
 *           type: boolean
 *           description: Correspondência exata com evidência de IA mantida pelo professor, derivada no servidor. Não é verificação da veracidade do repertório.
 *     FeedbackTrechoEntrada:
 *       type: object
 *       additionalProperties: false
 *       required: [inicio, fim, trecho]
 *       properties:
 *         inicio:
 *           type: integer
 *           minimum: 0
 *           maximum: 20000
 *         fim:
 *           type: integer
 *           minimum: 1
 *           maximum: 20000
 *         trecho:
 *           type: string
 *           minLength: 1
 *           maxLength: 20000
 *         analiseIaId:
 *           type: string
 *           format: uuid
 *           description: Análise concluída desta redação. Sem coincidência exata de critério, offsets e texto, a marcação é humana.
 */

export function criarFeedbacksRouter({
  autenticar = autenticarAccessToken,
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
   *     description: Retorna exclusivamente a versão publicada da correção de uma redação pertencente ao aluno autenticado. criterios[].trechos contém somente marcações aprovadas (FeedbackTrechoPublicado), sem analiseIaId, diagnóstico ou JSON privado. Rascunhos e versões substituídas permanecem privados.
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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     feedback:
   *                       type: object
   *                       properties:
   *                         criterios:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               trechos:
   *                                 type: array
   *                                 items:
   *                                   $ref: '#/components/schemas/FeedbackTrechoPublicado'
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para alunos
   *       '404':
   *         description: ESSAY_NOT_FOUND para redação inexistente ou de outro aluno; FEEDBACK_NOT_AVAILABLE para redação própria sem correção publicada
   *       '422':
   *         description: Identificador inválido
   */
  router.get(
    '/aluno/redacoes/:redacaoId/feedback',
    autenticar,
    somenteAluno,
    validarParams(feedbackParamsSchema),
    consultarAlunoController,
  )

  /**
   * @openapi
   * /api/redacoes/{redacaoId}/feedback:
   *   get:
   *     summary: Consulta a correção da redação
   *     description: Retorna a versão atual e o histórico completo do feedback humano, da versão mais recente para a mais antiga. Cada comentário inclui trechos (id, inicio, fim, trecho, sugeridoPorIa, analiseIaId), por início/fim. A referência à análise é exclusiva do professor. Retorna feedback nulo quando a redação ainda não possui correção.
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
    autenticar,
    somenteProfessor,
    validarParams(feedbackParamsSchema),
    consultarController,
  )

  /**
   * @openapi
   * /api/redacoes/{redacaoId}/feedback:
   *   put:
   *     summary: Salva o rascunho da correção
   *     description: Cria ou atualiza a versão de rascunho do feedback humano. A nota total é calculada pela soma das cinco competências e nada é publicado para o aluno nesta etapa. trechos omitido preserva as marcações do critério no rascunho atual ou, ao criar nova versão, na publicação atual; lista vazia remove. Offsets UTF-16 com fim exclusivo devem corresponder literalmente à redação e não cortar um par surrogate. Sobreposições são permitidas, intervalos duplicados no mesmo critério não. Origem de IA é derivada pelo servidor; booleanos do cliente são recusados.
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
   *               - competencia1
   *               - competencia2
   *               - competencia3
   *               - competencia4
   *               - competencia5
   *               - comentarioGeral
   *               - criterios
   *             properties:
   *               competencia1:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 200
   *                 nullable: true
   *               competencia2:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 200
   *                 nullable: true
   *               competencia3:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 200
   *                 nullable: true
   *               competencia4:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 200
   *                 nullable: true
   *               competencia5:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 200
   *                 nullable: true
   *               comentarioGeral:
   *                 type: string
   *                 nullable: true
   *               criterios:
   *                 type: array
   *                 items:
   *                   type: object
   *                   additionalProperties: false
   *                   required:
   *                     - criterioId
   *                     - comentario
   *                   properties:
   *                     criterioId:
   *                       type: string
   *                       format: uuid
   *                     comentario:
   *                       type: string
   *                       minLength: 1
   *                       maxLength: 5000
   *                     trechos:
   *                       type: array
   *                       maxItems: 20
   *                       items:
   *                         $ref: '#/components/schemas/FeedbackTrechoEntrada'
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
   *         description: Dados/critérios inválidos, FEEDBACK_EVIDENCE_INVALID (trecho não literal) ou FEEDBACK_ANALYSIS_INVALID (referência de análise indisponível para esta redação). Nada é salvo nessas falhas.
   */
  router.put(
    '/redacoes/:redacaoId/feedback',
    autenticar,
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
   *     description: Publica o rascunho completo, revalida os trechos aprovados, marca a redação como avaliada e cria uma notificação para o aluno na mesma transação. Comentários por critério são opcionais. A versão substituída conserva seus trechos.
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
   *         description: Identificador inválido, rascunho incompleto ou FEEDBACK_EVIDENCE_INVALID. Nenhuma publicação parcial.
   */
  router.post(
    '/redacoes/:redacaoId/feedback/publicar',
    autenticar,
    somenteProfessor,
    validarParams(feedbackParamsSchema),
    publicarController,
  )

  return router
}

export const feedbacksRouter = criarFeedbacksRouter()
