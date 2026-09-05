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
  arquivarTemaController,
  atualizarTemaController,
  criarTemaController,
  listarTemasAlunoController,
  listarTemasController,
  obterModeloCompetenciaDoisController,
  obterTemaAlunoController,
  obterTemaController,
  substituirCriteriosController,
} from './temas.controller.js'

import {
  atualizarTemaSchema,
  criarTemaSchema,
  substituirCriteriosSchema,
  temaParamsSchema,
  turmaTemaParamsSchema,
} from './temas.schemas.js'

export const temasRouter = Router()

const somenteProfessor = autorizarPapeis('PROFESSOR')
const somenteAluno = autorizarPapeis('ALUNO')

/**
 * @openapi
 * /api/modelos-avaliacao/competencia-2:
 *   get:
 *     summary: Consulta o modelo editável da Competência II
 *     description: Retorna os três critérios sugeridos para repertório sociocultural. O professor pode editar ou substituir todos antes de criar o tema.
 *     tags:
 *       - Temas de redação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Modelo e versão atuais
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 */
temasRouter.get(
  '/modelos-avaliacao/competencia-2',
  autenticarAccessToken,
  somenteProfessor,
  obterModeloCompetenciaDoisController,
)

/**
 * @openapi
 * /api/aluno/temas:
 *   get:
 *     summary: Lista os temas disponíveis para o aluno
 *     description: Retorna os temas ativos da turma em que o aluno possui matrícula ativa.
 *     tags:
 *       - Temas de redação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Temas disponíveis para o aluno
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: O aluno não possui matrícula ativa
 */
temasRouter.get(
  '/aluno/temas',
  autenticarAccessToken,
  somenteAluno,
  listarTemasAlunoController,
)

/**
 * @openapi
 * /api/aluno/temas/{temaId}:
 *   get:
 *     summary: Consulta um tema disponível
 *     description: Retorna um tema ativo pertencente à turma atual do aluno.
 *     tags:
 *       - Temas de redação
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
 *         description: Tema encontrado
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: Matrícula ou tema não encontrado
 *       '422':
 *         description: Identificador inválido
 */
temasRouter.get(
  '/aluno/temas/:temaId',
  autenticarAccessToken,
  somenteAluno,
  validarParams(temaParamsSchema),
  obterTemaAlunoController,
)

/**
 * @openapi
 * /api/turmas/{turmaId}/temas:
 *   post:
 *     summary: Cria um tema de redação
 *     description: Cria um tema e seus critérios em uma turma ativa do professor.
 *     tags:
 *       - Temas de redação
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: turmaId
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
 *               - enunciado
 *               - descricao
 *               - prazoEntrega
 *               - criterios
 *             properties:
 *               enunciado:
 *                 type: string
 *                 example: Os desafios da inclusão digital no Brasil
 *               descricao:
 *                 type: string
 *                 example: Produza um texto dissertativo-argumentativo sobre o tema proposto.
 *               instrucoes:
 *                 type: string
 *                 nullable: true
 *                 example: Utilize repertórios socioculturais pertinentes.
 *               prazoEntrega:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-12-01T23:59:00-03:00
 *               criterios:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   required:
 *                     - nome
 *                     - descricao
 *                   properties:
 *                     nome:
 *                       type: string
 *                       example: Pertinência do repertório
 *                     descricao:
 *                       type: string
 *                       example: Avalia a relação do repertório com o argumento.
 *     responses:
 *       '201':
 *         description: Tema criado
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma não encontrada ou arquivada
 *       '422':
 *         description: Dados de entrada inválidos
 *   get:
 *     summary: Lista os temas de uma turma
 *     description: Retorna os temas ativos e arquivados da turma do professor.
 *     tags:
 *       - Temas de redação
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: turmaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Temas da turma
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '422':
 *         description: Identificador inválido
 */
temasRouter.post(
  '/turmas/:turmaId/temas',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaTemaParamsSchema),
  validarBody(criarTemaSchema),
  criarTemaController,
)

temasRouter.get(
  '/turmas/:turmaId/temas',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaTemaParamsSchema),
  listarTemasController,
)

/**
 * @openapi
 * /api/temas/{temaId}:
 *   get:
 *     summary: Consulta um tema
 *     description: Retorna um tema pertencente ao professor autenticado.
 *     tags:
 *       - Temas de redação
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
 *         description: Tema encontrado
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Tema não encontrado
 *       '422':
 *         description: Identificador inválido
 *   patch:
 *     summary: Atualiza um tema
 *     description: Atualiza o conteúdo ou o prazo de entrega do tema.
 *     tags:
 *       - Temas de redação
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
 *             properties:
 *               enunciado:
 *                 type: string
 *               descricao:
 *                 type: string
 *               instrucoes:
 *                 type: string
 *                 nullable: true
 *               prazoEntrega:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       '200':
 *         description: Tema atualizado
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Tema não encontrado
 *       '409':
 *         description: Tema arquivado ou conteúdo bloqueado
 *       '422':
 *         description: Dados de entrada inválidos
 */
temasRouter.get(
  '/temas/:temaId',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(temaParamsSchema),
  obterTemaController,
)

temasRouter.patch(
  '/temas/:temaId',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(temaParamsSchema),
  validarBody(atualizarTemaSchema),
  atualizarTemaController,
)

/**
 * @openapi
 * /api/temas/{temaId}/criterios:
 *   put:
 *     summary: Substitui os critérios do tema
 *     description: Substitui a lista ordenada de critérios antes da primeira redação.
 *     tags:
 *       - Temas de redação
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
 *               - criterios
 *             properties:
 *               criterios:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   required:
 *                     - nome
 *                     - descricao
 *                   properties:
 *                     nome:
 *                       type: string
 *                     descricao:
 *                       type: string
 *     responses:
 *       '200':
 *         description: Critérios substituídos
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Tema não encontrado
 *       '409':
 *         description: Tema arquivado ou critérios bloqueados
 *       '422':
 *         description: Dados de entrada inválidos
 */
temasRouter.put(
  '/temas/:temaId/criterios',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(temaParamsSchema),
  validarBody(substituirCriteriosSchema),
  substituirCriteriosController,
)

/**
 * @openapi
 * /api/temas/{temaId}/arquivar:
 *   post:
 *     summary: Arquiva um tema
 *     description: Arquiva o tema sem apagar seus critérios ou redações.
 *     tags:
 *       - Temas de redação
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
 *         description: Tema arquivado
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Tema não encontrado
 *       '409':
 *         description: Tema já arquivado
 *       '422':
 *         description: Identificador inválido
 */
temasRouter.post(
  '/temas/:temaId/arquivar',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(temaParamsSchema),
  arquivarTemaController,
)
