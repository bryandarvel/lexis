import { Router } from 'express'

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
  criarListarNotificacoesController,
  criarMarcarNotificacaoLidaController,
} from './notificacoes.controller.js'
import {
  notificacaoParamsSchema,
} from './notificacoes.schemas.js'
import {
  listarNotificacoesParaAluno,
  marcarNotificacaoLidaParaAluno,
  listarNotificacoesParaProfessor,
  marcarNotificacaoLidaParaProfessor,
} from './notificacoes.service.js'

const somenteAluno = autorizarPapeis('ALUNO')
const somenteProfessor = autorizarPapeis('PROFESSOR')

export function criarNotificacoesRouter({
  autenticar = autenticarAccessToken,
  listarNotificacoes = listarNotificacoesParaAluno,
  marcarNotificacaoLida =
    marcarNotificacaoLidaParaAluno,
  listarNotificacoesProfessor = listarNotificacoesParaProfessor,
  marcarNotificacaoProfessorLida = marcarNotificacaoLidaParaProfessor,
} = {}) {
  const router = Router()
  const listarController =
    criarListarNotificacoesController({
      listarNotificacoes,
    })
  const marcarLidaController =
    criarMarcarNotificacaoLidaController({
      marcarNotificacaoLida,
    })

  /**
   * @openapi
   * /api/aluno/notificacoes:
   *   get:
   *     summary: Lista as notificações do aluno
   *     description: Retorna as notificações próprias da mais recente para a mais antiga e a quantidade total não lida. Além de FEEDBACK_PUBLICADO/FEEDBACK_CORRIGIDO, inclui MATRICULA_ENCERRADA e TURMA_ARQUIVADA; estes avisos internos têm feedbackVersaoId, feedbackVersao, redacaoId e redacao nulos, statusEmail nulo, título e mensagem sobre o histórico preservado. Não representam correção nova nem devem abrir feedback inexistente.
   *     tags:
   *       - Notificações
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Notificações do aluno
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para alunos
   */
  router.get(
    '/aluno/notificacoes',
    autenticar,
    somenteAluno,
    listarController,
  )

  /**
   * @openapi
   * /api/aluno/notificacoes/{notificacaoId}/lida:
   *   patch:
   *     summary: Marca uma notificação como lida
   *     description: Registra a leitura de uma notificação pertencente ao aluno autenticado. A operação é idempotente.
   *     tags:
   *       - Notificações
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificacaoId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       '200':
   *         description: Notificação marcada como lida
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para alunos
   *       '404':
   *         description: Notificação não encontrada
   *       '422':
   *         description: Identificador inválido
   */
  router.patch(
    '/aluno/notificacoes/:notificacaoId/lida',
    autenticar,
    somenteAluno,
    validarParams(notificacaoParamsSchema),
    marcarLidaController,
  )

  /**
   * @openapi
   * /api/professor/notificacoes:
   *   get:
   *     summary: Lista as notificações do professor
   *     description: Somente avisos do professor autenticado, da mais recente para a mais antiga. data contém notificacoes e totalNaoLidas. REDACAO_ENVIADA inclui redacaoId e redacao.tema (id, enunciado, turma com id e nome), nunca texto da redação ou análise privada. ALUNO_SAIU_TURMA identifica aluno e turma na mensagem, com redacaoId, redacao e feedbackVersao nulos; não há correção a abrir. Eventos novos são exclusivamente internos, sem e-mail.
   *     tags:
   *       - Notificações
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Notificações e contagem de não lidas do professor
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para professores
   */
  router.get(
    '/professor/notificacoes',
    autenticar,
    somenteProfessor,
    criarListarNotificacoesController({
      listarNotificacoes: listarNotificacoesProfessor,
      campoUsuario: 'professorId',
    }),
  )

  /**
   * @openapi
   * /api/professor/notificacoes/{notificacaoId}/lida:
   *   patch:
   *     summary: Marca uma notificação do professor como lida
   *     description: Somente o proprietário pode marcar. Mantém a primeira data de leitura, inclusive em requisições concorrentes. Retorna data.notificacao; não recebe corpo.
   *     tags:
   *       - Notificações
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificacaoId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       '200':
   *         description: Notificação marcada como lida
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para professores
   *       '404':
   *         description: NOTIFICATION_NOT_FOUND — inexistente ou pertencente a outro usuário
   *       '422':
   *         description: Identificador inválido
   */
  router.patch(
    '/professor/notificacoes/:notificacaoId/lida',
    autenticar,
    somenteProfessor,
    validarParams(notificacaoParamsSchema),
    criarMarcarNotificacaoLidaController({
      marcarNotificacaoLida: marcarNotificacaoProfessorLida,
      campoUsuario: 'professorId',
    }),
  )

  return router
}

export const notificacoesRouter =
  criarNotificacoesRouter()
