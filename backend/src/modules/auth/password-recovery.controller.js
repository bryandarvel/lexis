import { criarOpcoesLimparRefreshCookie, REFRESH_TOKEN_COOKIE_NAME } from './auth-cookie.js'
import { redefinirSenha, solicitarRecuperacaoSenha } from './password-recovery.service.js'

export async function solicitarRecuperacaoController(req, res) {
  const data = await solicitarRecuperacaoSenha(req.body)
  return res.status(202).json({ data })
}

export async function redefinirSenhaController(req, res) {
  await redefinirSenha(req.body)
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, criarOpcoesLimparRefreshCookie())
  return res.status(204).send()
}
