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
  atualizarPerfilController,
  alterarSenhaController,
  excluirContaController,
  solicitarAlteracaoEmailController,
  confirmarAlteracaoEmailController,
} from './auth.controller.js'

import {
  cadastroSchema,
  loginSchema,
  atualizarPerfilSchema,
  alterarSenhaSchema,
  excluirContaSchema,
  solicitarAlteracaoEmailSchema,
  confirmarAlteracaoEmailSchema,
} from './auth.schemas.js'

import {
  autenticarAccessToken,
} from '../../middlewares/authenticate-access-token.js'

import {
  limitarCadastro,
  limitarLogin,
  limitarRefresh,
  limitarAlteracaoSenha,
  limitarExclusaoConta,
  limitarEdicaoPerfil,
  limitarAlteracaoEmail,
  limitarConfirmacaoEmail,
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

/**
 * @openapi
 * /api/auth/me:
 *   patch:
 *     summary: Altera o próprio nome
 *     description: Aluno e professor confirmam a senha atual para editar o próprio nome. O e-mail é alterado por fluxo separado.
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [nome, senhaAtual]
 *             properties:
 *               nome: { type: string, minLength: 2, maxLength: 120 }
 *               senhaAtual: { type: string, format: password, minLength: 1, maxLength: 72 }
 *     responses:
 *       '200': { description: Nome atualizado em data.usuario }
 *       '401': { description: Autenticação inválida, sessão alterada ou conta inativa }
 *       '422': { description: CURRENT_PASSWORD_INVALID ou VALIDATION_ERROR }
 *       '429': { description: Limite de tentativas atingido }
 * /api/auth/alterar-senha:
 *   post:
 *     summary: Solicita a troca de senha pelo e-mail atual
 *     description: Confere a senha atual e enfileira um link. A senha só muda por /api/auth/redefinir-senha com o token recebido; todas as sessões são revogadas nessa etapa.
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [senhaAtual]
 *             properties:
 *               senhaAtual: { type: string, format: password, minLength: 1, maxLength: 72 }
 *     responses:
 *       '202': { description: Solicitação recebida, sem confirmar entrega }
 *       '401': { description: Autenticação inválida ou sessão alterada por outra operação concorrente }
 *       '422': { description: CURRENT_PASSWORD_INVALID ou VALIDATION_ERROR, com detalhes por campo }
 *       '429': { description: RATE_LIMIT_EXCEEDED — máximo de 10 tentativas por usuário em 15 minutos, incluindo sucessos }
 *       '503': { description: PASSWORD_RECOVERY_UNAVAILABLE }
 */
authRouter.patch('/me', autenticarAccessToken, limitarEdicaoPerfil, validarBody(atualizarPerfilSchema), atualizarPerfilController)
authRouter.post('/alterar-senha', autenticarAccessToken, limitarAlteracaoSenha, validarBody(alterarSenhaSchema), alterarSenhaController)

/**
 * @openapi
 * /api/auth/alterar-email:
 *   post:
 *     summary: Solicita a alteração do e-mail da própria conta
 *     description: Exige senha atual e envia um link de uso único ao novo endereço. O e-mail atual permanece ativo até a confirmação.
 *     tags: [Autenticação]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [senhaAtual, novoEmail]
 *             properties:
 *               senhaAtual: { type: string, format: password, minLength: 1, maxLength: 72 }
 *               novoEmail: { type: string, format: email, maxLength: 191 }
 *     responses:
 *       '202': { description: Link enviado ao novo endereço; nada foi alterado na conta }
 *       '401': { description: Sessão inválida }
 *       '409': { description: EMAIL_ALREADY_IN_USE }
 *       '422': { description: Dados inválidos, CURRENT_PASSWORD_INVALID ou EMAIL_UNCHANGED }
 *       '429': { description: Limite de solicitações atingido }
 *       '503': { description: EMAIL_CHANGE_DELIVERY_UNAVAILABLE }
 * /api/auth/confirmar-email:
 *   post:
 *     summary: Consome o link e confirma a troca de e-mail
 *     description: Revoga todas as sessões e recuperações anteriores e tenta avisar o endereço antigo. Não exige acesso ao endereço antigo.
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [token]
 *             properties:
 *               token: { type: string, pattern: '^[a-f0-9]{64}$' }
 *     responses:
 *       '200':
 *         description: E-mail alterado; gera data.avisoEmailAnteriorEnviado e limpa o cookie de renovação
 *       '409': { description: EMAIL_ALREADY_IN_USE }
 *       '422': { description: Dados inválidos ou EMAIL_CHANGE_INVALID }
 *       '429': { description: Limite de tentativas atingido }
 */
authRouter.post('/alterar-email', autenticarAccessToken, limitarAlteracaoEmail, validarBody(solicitarAlteracaoEmailSchema), solicitarAlteracaoEmailController)
authRouter.post('/confirmar-email', limitarConfirmacaoEmail, validarBody(confirmarAlteracaoEmailSchema), confirmarAlteracaoEmailController)

/**
 * @openapi
 * /api/auth/me:
 *   delete:
 *     summary: Exclui a própria conta e invalida todas as sessões
 *     description: Substitui os dados cadastrais, encerra matrículas ativas e preserva redações e correções. Professores devem arquivar todas as turmas primeiro.
 *     tags: [Autenticação]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [senhaAtual]
 *             properties:
 *               senhaAtual: { type: string, format: password, minLength: 1, maxLength: 72 }
 *     responses:
 *       '204': { description: Conta excluída; cookie de renovação limpo }
 *       '401': { description: Sessão inválida }
 *       '409': { description: ACCOUNT_HAS_ACTIVE_CLASSES }
 *       '422': { description: Dados inválidos ou CURRENT_PASSWORD_INVALID }
 *       '429': { description: Muitas tentativas }
 */
authRouter.delete('/me', autenticarAccessToken, limitarExclusaoConta, validarBody(excluirContaSchema), excluirContaController)
