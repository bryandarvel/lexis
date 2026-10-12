import { Router } from 'express'

import {
  autenticarAccessToken,
} from '../../middlewares/authenticate-access-token.js'
import {
  autorizarPapeis,
} from '../../middlewares/authorize-roles.js'

import {
  criarObterDesempenhoController,
} from './desempenho.controller.js'
import {
  obterDesempenhoParaAluno,
} from './desempenho.service.js'

const somenteAluno = autorizarPapeis('ALUNO')

export function criarDesempenhoRouter({
  autenticar = autenticarAccessToken,
  obterDesempenho = obterDesempenhoParaAluno,
} = {}) {
  const router = Router()
  const obterController =
    criarObterDesempenhoController({
      obterDesempenho,
    })

  /**
   * @openapi
   * /api/aluno/desempenho:
   *   get:
   *     summary: Resume o desempenho do aluno
   *     description: Calcula, a partir das correções publicadas pelos professores, a média geral, a última nota e a média da Competência II do aluno autenticado, além dos totais de redações enviadas e corrigidas. Sem correção publicada, as médias e a última nota são nulas. As médias são arredondadas para uma casa decimal.
   *     tags:
   *       - Desempenho
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Desempenho do aluno
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     desempenho:
   *                       type: object
   *                       properties:
   *                         mediaGeral:
   *                           type: number
   *                           nullable: true
   *                           description: Média das notas (0 a 1000) das versões publicadas.
   *                         ultimaNota:
   *                           type: integer
   *                           nullable: true
   *                           description: Nota da versão publicada mais recente.
   *                         mediaCompetencia2:
   *                           type: number
   *                           nullable: true
   *                           description: Média da Competência II (0 a 200) das versões publicadas.
   *                         totalEnviadas:
   *                           type: integer
   *                           description: Redações com status diferente de RASCUNHO.
   *                         totalCorrigidas:
   *                           type: integer
   *                           description: Redações com correção publicada.
   *       '401':
   *         description: Autenticação necessária
   *       '403':
   *         description: Recurso exclusivo para alunos
   */
  router.get(
    '/aluno/desempenho',
    autenticar,
    somenteAluno,
    obterController,
  )

  return router
}

export const desempenhoRouter =
  criarDesempenhoRouter()
