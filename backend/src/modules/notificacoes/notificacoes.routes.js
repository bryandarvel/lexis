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
} from './notificacoes.service.js'

const somenteAluno = autorizarPapeis('ALUNO')

export function criarNotificacoesRouter({
  listarNotificacoes = listarNotificacoesParaAluno,
  marcarNotificacaoLida =
    marcarNotificacaoLidaParaAluno,
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
   *     description: Retorna as notificações da mais recente para a mais antiga e a quantidade total de notificações não lidas.
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
    autenticarAccessToken,
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
    autenticarAccessToken,
    somenteAluno,
    validarParams(notificacaoParamsSchema),
    marcarLidaController,
  )

  return router
}

export const notificacoesRouter =
  criarNotificacoesRouter()
