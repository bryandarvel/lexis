import { Router } from 'express'

import {
  autenticarAccessToken,
} from '../../middlewares/authenticate-access-token.js'
import {
  autorizarPapeis,
} from '../../middlewares/authorize-roles.js'

import {
  limitarOcr,
} from '../../middlewares/ocr-rate-limiter.js'
import {
  receberImagemOcr,
} from '../../middlewares/upload-ocr-image.js'

import {
  validarBody,
  validarParams,
  validarQuery,
} from '../../middlewares/validate-request.js'

import {
  enviarRedacaoController,
  listarRedacoesAlunoController,
  listarRedacoesProfessorController,
  obterRedacaoAlunoController,
  obterRedacaoProfessorController,
  salvarRascunhoController,
  transcreverImagemController,
} from './redacoes.controller.js'

import {
  listarRedacoesTurmaQuerySchema,
  redacaoParamsSchema,
  salvarRascunhoSchema,
  temaRedacaoParamsSchema,
  turmaRedacoesParamsSchema,
} from './redacoes.schemas.js'

export const redacoesRouter = Router()

const somenteAluno = autorizarPapeis('ALUNO')
const somenteProfessor = autorizarPapeis('PROFESSOR')

/**
 * @openapi
 * /api/aluno/temas/{temaId}/redacao:
 *   put:
 *     summary: Salva o rascunho de uma redação
 *     description: Cria ou atualiza o rascunho digitado do aluno para o tema informado.
 *     tags:
 *       - Redações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: temaId
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
 *               - texto
 *             properties:
 *               texto:
 *                 type: string
 *                 example: A Constituição Federal de 1988 assegura...
 *     responses:
 *       '200':
 *         description: Rascunho salvo
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: Tema indisponível para o aluno
 *       '409':
 *         description: A redação já foi enviada
 *       '422':
 *         description: Dados de entrada inválidos
 */
redacoesRouter.put(
  '/aluno/temas/:temaId/redacao',
  autenticarAccessToken,
  somenteAluno,
  validarParams(temaRedacaoParamsSchema),
  validarBody(salvarRascunhoSchema),
  salvarRascunhoController,
)

/**
 * @openapi
 * /api/aluno/temas/{temaId}/redacao/ocr:
 *   post:
 *     summary: Extrai o texto de uma redação manuscrita
 *     description: Recebe uma imagem JPEG ou PNG, extrai seu texto e salva um rascunho que deverá ser revisado pelo aluno.
 *     tags:
 *       - Redações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: temaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - imagem
 *             properties:
 *               imagem:
 *                 type: string
 *                 format: binary
 *                 description: Imagem JPEG ou PNG com até 1 MB
 *     responses:
 *       '200':
 *         description: Texto extraído e salvo como rascunho
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: Tema indisponível para o aluno
 *       '409':
 *         description: A redação já foi enviada
 *       '413':
 *         description: Imagem maior que 1 MB
 *       '415':
 *         description: Formato de imagem não permitido
 *       '422':
 *         description: Imagem ausente, inválida ou sem texto legível
 *       '429':
 *         description: Limite de transcrições excedido
 *       '502':
 *         description: Serviço OCR indisponível
 *       '503':
 *         description: Serviço OCR não configurado ou limite externo atingido
 *       '504':
 *         description: Tempo limite do serviço OCR excedido
 */
redacoesRouter.post(
  '/aluno/temas/:temaId/redacao/ocr',
  autenticarAccessToken,
  somenteAluno,
  validarParams(temaRedacaoParamsSchema),
  limitarOcr,
  receberImagemOcr,
  transcreverImagemController,
)


/**
 * @openapi
 * /api/aluno/temas/{temaId}/redacao/enviar:
 *   post:
 *     summary: Envia definitivamente uma redação
 *     description: Envia o rascunho existente. A redação não poderá mais ser alterada ou reenviada.
 *     tags:
 *       - Redações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: temaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Redação enviada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: Tema ou rascunho não encontrado
 *       '409':
 *         description: A redação já foi enviada
 *       '422':
 *         description: Identificador inválido
 */
redacoesRouter.post(
  '/aluno/temas/:temaId/redacao/enviar',
  autenticarAccessToken,
  somenteAluno,
  validarParams(temaRedacaoParamsSchema),
  enviarRedacaoController,
)

/**
 * @openapi
 * /api/aluno/redacoes:
 *   get:
 *     summary: Lista as redações do aluno
 *     description: Retorna os rascunhos e envios pertencentes ao aluno autenticado.
 *     tags:
 *       - Redações
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Redações do aluno
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 */
redacoesRouter.get(
  '/aluno/redacoes',
  autenticarAccessToken,
  somenteAluno,
  listarRedacoesAlunoController,
)

/**
 * @openapi
 * /api/aluno/redacoes/{redacaoId}:
 *   get:
 *     summary: Consulta uma redação do aluno
 *     description: Retorna uma redação pertencente ao aluno autenticado.
 *     tags:
 *       - Redações
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
 *         description: Redação encontrada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: Redação não encontrada
 *       '422':
 *         description: Identificador inválido
 */
redacoesRouter.get(
  '/aluno/redacoes/:redacaoId',
  autenticarAccessToken,
  somenteAluno,
  validarParams(redacaoParamsSchema),
  obterRedacaoAlunoController,
)

/**
 * @openapi
 * /api/turmas/{turmaId}/redacoes:
 *   get:
 *     summary: Lista as redações enviadas de uma turma
 *     description: Retorna somente redações enviadas ou avaliadas. Rascunhos dos alunos permanecem privados.
 *     tags:
 *       - Redações
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: turmaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: temaId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - ENVIADA
 *             - AVALIADA
 *     responses:
 *       '200':
 *         description: Redações enviadas da turma
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma não encontrada
 *       '422':
 *         description: Parâmetros ou filtros inválidos
 */
redacoesRouter.get(
  '/turmas/:turmaId/redacoes',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaRedacoesParamsSchema),
  validarQuery(listarRedacoesTurmaQuerySchema),
  listarRedacoesProfessorController,
)

/**
 * @openapi
 * /api/redacoes/{redacaoId}:
 *   get:
 *     summary: Consulta uma redação enviada
 *     description: Retorna uma redação enviada de uma turma pertencente ao professor autenticado.
 *     tags:
 *       - Redações
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
 *         description: Redação encontrada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Redação não encontrada
 *       '422':
 *         description: Identificador inválido
 */
redacoesRouter.get(
  '/redacoes/:redacaoId',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(redacaoParamsSchema),
  obterRedacaoProfessorController,
)