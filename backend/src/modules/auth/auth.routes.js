import { Router } from 'express'
import { solicitarRecuperacaoController, redefinirSenhaController } from './password-recovery.controller.js'
import { solicitarRecuperacaoSchema, redefinirSenhaSchema } from './auth.schemas.js'
import { limitarRecuperacao, limitarRedefinicao } from '../../middlewares/auth-rate-limiters.js'

import { validarBody } from '../../middlewares/validate-request.js'
import {
  cadastrarUsuarioController,
  loginController,
  logoutController,
  obterUsuarioAtualController,
  renovarSessaoController,
} from './auth.controller.js'

import {
  cadastroSchema,
  loginSchema,
} from './auth.schemas.js'

import {
  autenticarAccessToken,
} from '../../middlewares/authenticate-access-token.js'

import {
  limitarCadastro,
  limitarLogin,
  limitarRefresh,
} from '../../middlewares/auth-rate-limiters.js'

export const authRouter = Router()

/**
 * @openapi
 * /api/auth/recuperar-senha:
 *   post:
 *     summary: Solicita instruções de recuperação de senha
 *     description: Resposta idêntica para conta existente, inexistente ou inativa. Enfileira o envio quando habilitado; não confirma entrega.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, maxLength: 191 }
 *     responses:
 *       '202': { description: Solicitação recebida sem divulgar existência de conta }
 *       '422': { description: E-mail inválido }
 *       '429': { description: Limite de solicitações atingido }
 *       '503': { description: Recuperação indisponível para todos os usuários }
 * /api/auth/redefinir-senha:
 *   post:
 *     summary: Redefine a senha com token de uso único
 *     description: Consome o token atomicamente e revoga sessões anteriores. A senha segue as regras do cadastro e o token é enviado somente no corpo.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [token, senha]
 *             properties:
 *               token: { type: string, pattern: '^[a-f0-9]{64}$' }
 *               senha: { type: string, format: password, minLength: 10, maxLength: 72 }
 *     responses:
 *       '204': { description: Senha redefinida; faça login novamente }
 *       '422': { description: Token inválido/expirado/usado ou senha fora das regras }
 *       '429': { description: Limite de tentativas atingido }
 */
authRouter.post('/recuperar-senha', limitarRecuperacao, validarBody(solicitarRecuperacaoSchema), solicitarRecuperacaoController)
authRouter.post('/redefinir-senha', limitarRedefinicao, validarBody(redefinirSenhaSchema), redefinirSenhaController)

/**
 * @openapi
 * /api/auth/cadastro:
 *   post:
 *     summary: Cadastra um novo usuário
 *     description: Cria uma conta de professor ou aluno.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - nome
 *               - email
 *               - senha
 *               - papel
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Maria da Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: maria@exemplo.com
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: SenhaSegura123
 *               papel:
 *                 type: string
 *                 enum:
 *                   - PROFESSOR
 *                   - ALUNO
 *     responses:
 *       '201':
 *         description: Usuário cadastrado
 *       '409':
 *         description: E-mail já cadastrado
 *       '422':
 *         description: Dados de entrada inválidos
 */
authRouter.post(
  '/cadastro',
  limitarCadastro,
  validarBody(cadastroSchema),
  cadastrarUsuarioController,
)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Autentica um usuário
 *     description: Retorna um access token e grava o refresh token em cookie HttpOnly.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: professor@lexis.local
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: SenhaDev123
 *     responses:
 *       '200':
 *         description: Login realizado
  *       '429':
 *         description: Limite de tentativas excedido
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token em cookie HttpOnly
 *             schema:
 *               type: string
 *       '401':
 *         description: Credenciais inválidas
 *       '422':
 *         description: Dados de entrada inválidos
 */
authRouter.post(
  '/login',
  limitarLogin,
  validarBody(loginSchema),
  loginController,
)

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Renova a sessão do usuário
 *     description: Rotaciona o refresh token recebido pelo cookie HttpOnly e retorna um novo access token.
 *     tags:
 *       - Autenticação
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Sessão renovada
  *       '429':
 *         description: Limite de tentativas excedido
 *         headers:
 *           Set-Cookie:
 *             description: Novo refresh token em cookie HttpOnly
 *             schema:
 *               type: string
 *       '401':
 *         description: Refresh token ausente, inválido, expirado ou reutilizado
 */
authRouter.post(
  '/refresh',
  limitarRefresh,
  renovarSessaoController,
)

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Encerra a sessão do usuário
 *     description: Revoga a família de refresh tokens da sessão atual e remove o cookie HttpOnly. A operação é idempotente.
 *     tags:
 *       - Autenticação
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '204':
 *         description: Sessão encerrada
  *       '429':
 *         description: Limite de tentativas excedido
 *         headers:
 *           Set-Cookie:
 *             description: Remove o cookie de refresh token
 *             schema:
 *               type: string
 */
authRouter.post(
  '/logout',
  logoutController,
)

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Retorna o usuário autenticado
 *     description: Valida o access token e consulta os dados atuais do usuário.
 *     tags:
 *       - Autenticação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Usuário autenticado
 *       '401':
 *         description: Autenticação ausente, inválida ou usuário indisponível
 */
authRouter.get(
  '/me',
  autenticarAccessToken,
  obterUsuarioAtualController,
)
