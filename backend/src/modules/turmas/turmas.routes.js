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
  arquivarTurmaController,
  criarTurmaController,
  entrarEmTurmaController,
  listarTurmasController,
  obterMinhaMatriculaController,
  obterTurmaController,
  regenerarCodigoController,
  renomearTurmaController,
  sairDaTurmaController,
  desvincularAlunoController,
  listarAlunosDaTurmaController,
} from './turmas.controller.js'

import {
  atualizarTurmaSchema,
  criarTurmaSchema,
  entrarTurmaSchema,
  turmaAlunoParamsSchema,
  turmaParamsSchema,
} from './turmas.schemas.js'

export const turmasRouter = Router()

const somenteProfessor = autorizarPapeis('PROFESSOR')
const somenteAluno = autorizarPapeis('ALUNO')

/**
 * @openapi
 * /api/turmas/{turmaId}/alunos:
 *   get:
 *     summary: Lista os alunos ativos da turma
 *     description: Retorna as matrículas ativas de uma turma pertencente ao professor autenticado.
 *     tags:
 *       - Turmas
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
 *         description: Matrículas ativas da turma
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma não encontrada
 *       '409':
 *         description: Turma arquivada
 *       '422':
 *         description: Identificador inválido
 */
turmasRouter.get(
  '/:turmaId/alunos',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaParamsSchema),
  listarAlunosDaTurmaController,
)

/**
 * @openapi
 * /api/turmas/{turmaId}/alunos/{alunoId}:
 *   delete:
 *     summary: Desvincula um aluno da turma
 *     description: Encerra a matrícula ativa do aluno sem apagar seu histórico.
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: turmaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: alunoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Matrícula encerrada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma ou matrícula não encontrada
 *       '409':
 *         description: Turma arquivada
 *       '422':
 *         description: Identificador inválido
 */
turmasRouter.delete(
  '/:turmaId/alunos/:alunoId',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaAlunoParamsSchema),
  desvincularAlunoController,
)

/**
 * @openapi
 * /api/turmas:
 *   post:
 *     summary: Cria uma turma
 *     description: Cria uma turma vinculada ao professor autenticado e gera seu código de acesso.
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Turma 3º Ano A
 *     responses:
 *       '201':
 *         description: Turma criada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '422':
 *         description: Dados de entrada inválidos
 *       '503':
 *         description: Não foi possível gerar o código
 *   get:
 *     summary: Lista as turmas do professor
 *     description: Retorna as turmas ativas e arquivadas pertencentes ao professor autenticado.
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Turmas do professor
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 */
turmasRouter.post(
  '/',
  autenticarAccessToken,
  somenteProfessor,
  validarBody(criarTurmaSchema),
  criarTurmaController,
)

turmasRouter.get(
  '/',
  autenticarAccessToken,
  somenteProfessor,
  listarTurmasController,
)

/**
 * @openapi
 * /api/turmas/{turmaId}:
 *   get:
 *     summary: Consulta uma turma
 *     description: Retorna uma turma pertencente ao professor autenticado.
 *     tags:
 *       - Turmas
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
 *         description: Turma encontrada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma não encontrada
 *       '422':
 *         description: Identificador inválido
 *   patch:
 *     summary: Renomeia uma turma
 *     description: Altera o nome de uma turma ativa pertencente ao professor autenticado.
 *     tags:
 *       - Turmas
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
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Turma 3º Ano B
 *     responses:
 *       '200':
 *         description: Turma renomeada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma não encontrada
 *       '409':
 *         description: Turma arquivada
 *       '422':
 *         description: Dados de entrada inválidos
 */
 
 /**
 * @openapi
 * /api/turmas/entrar:
 *   post:
 *     summary: Entra em uma turma
 *     description: Cria a matrícula do aluno usando o código de uma turma ativa.
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - codigoAcesso
 *             properties:
 *               codigoAcesso:
 *                 type: string
 *                 example: ABCD2345
 *     responses:
 *       '201':
 *         description: Matrícula criada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: Código de turma inválido
 *       '409':
 *         description: O aluno já possui matrícula ativa
 *       '422':
 *         description: Dados de entrada inválidos
 */
turmasRouter.post(
  '/entrar',
  autenticarAccessToken,
  somenteAluno,
  validarBody(entrarTurmaSchema),
  entrarEmTurmaController,
)

/**
 * @openapi
 * /api/turmas/minha-matricula:
 *   get:
 *     summary: Consulta a matrícula ativa
 *     description: Retorna a turma atual do aluno autenticado.
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Matrícula ativa encontrada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: O aluno não possui matrícula ativa
 *   delete:
 *     summary: Sai da turma atual
 *     description: Encerra a matrícula ativa sem apagar seu histórico.
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Matrícula encerrada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para alunos
 *       '404':
 *         description: O aluno não possui matrícula ativa
 */
turmasRouter.get(
  '/minha-matricula',
  autenticarAccessToken,
  somenteAluno,
  obterMinhaMatriculaController,
)

turmasRouter.delete(
  '/minha-matricula',
  autenticarAccessToken,
  somenteAluno,
  sairDaTurmaController,
)
 
turmasRouter.get(
  '/:turmaId',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaParamsSchema),
  obterTurmaController,
)

turmasRouter.patch(
  '/:turmaId',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaParamsSchema),
  validarBody(atualizarTurmaSchema),
  renomearTurmaController,
)

/**
 * @openapi
 * /api/turmas/{turmaId}/regenerar-codigo:
 *   post:
 *     summary: Regenera o código da turma
 *     description: Invalida o código anterior e gera um novo código para uma turma ativa.
 *     tags:
 *       - Turmas
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
 *         description: Código regenerado
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma não encontrada
 *       '409':
 *         description: Turma arquivada
 *       '422':
 *         description: Identificador inválido
 *       '503':
 *         description: Não foi possível gerar o código
 */
turmasRouter.post(
  '/:turmaId/regenerar-codigo',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaParamsSchema),
  regenerarCodigoController,
)

/**
 * @openapi
 * /api/turmas/{turmaId}/arquivar:
 *   post:
 *     summary: Arquiva uma turma
 *     description: Arquiva a turma e encerra suas matrículas ativas, preservando todo o histórico.
 *     tags:
 *       - Turmas
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
 *         description: Turma arquivada
 *       '401':
 *         description: Autenticação necessária
 *       '403':
 *         description: Recurso exclusivo para professores
 *       '404':
 *         description: Turma não encontrada
 *       '409':
 *         description: Turma já arquivada
 *       '422':
 *         description: Identificador inválido
 */
turmasRouter.post(
  '/:turmaId/arquivar',
  autenticarAccessToken,
  somenteProfessor,
  validarParams(turmaParamsSchema),
  arquivarTurmaController,
)