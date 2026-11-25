import { randomBytes } from 'node:crypto'
import { env } from '../../config/env.js'
import { enviarEmailComResend } from '../../integrations/resend.client.js'
import { AppError } from '../../utils/app-error.js'
import { confirmarSenhaAtual } from './auth.service.js'
import { criarHashToken } from './auth-token.service.js'
import { cancelarAlteracaoEmail, consumirAlteracaoEmail, registrarAlteracaoEmail } from './email-change.repository.js'

const validadeDaSolicitacao = hora => new Date(hora.getTime() + 30 * 60_000)

function podeEnviar(email, ambiente, destinatarioDemo) {
  // Não redirecionar prova de posse: o link só pode ir à caixa solicitada.
  return ambiente === 'production' || email === destinatarioDemo?.toLowerCase()
}

function erroEmailEmUso() {
  return new AppError('Este e-mail já está cadastrado.', { statusCode: 409, code: 'EMAIL_ALREADY_IN_USE' })
}

export async function solicitarAlteracaoEmail(dados, {
  habilitado = env.EMAIL_ENABLED, ambiente = env.NODE_ENV, destinatarioDemo = env.EMAIL_DEMO_RECIPIENT,
  frontendUrl = env.FRONTEND_URL, enviar = enviarEmailComResend, agora = () => new Date(),
} = {}) {
  const usuario = await confirmarSenhaAtual(dados)
  const { novoEmail } = dados
  if (!habilitado || !podeEnviar(novoEmail, ambiente, destinatarioDemo)) {
    throw new AppError('O envio de confirmação para esse endereço está indisponível.', {
      statusCode: 503, code: 'EMAIL_CHANGE_DELIVERY_UNAVAILABLE',
    })
  }
  const token = randomBytes(32).toString('hex')
  const tokenHash = criarHashToken(token)
  const resultado = await registrarAlteracaoEmail({
    usuarioId: usuario.id, sessaoVersao: usuario.sessaoVersao, senhaHashEsperada: usuario.senhaHash,
    novoEmail, tokenHash, expiraEm: validadeDaSolicitacao(agora()),
  })
  if (resultado === 'IGUAL') throw new AppError('Informe um endereço diferente do atual.', { statusCode: 422, code: 'EMAIL_UNCHANGED' })
  if (resultado === 'EM_USO') throw erroEmailEmUso()
  if (resultado !== 'REGISTRADA') throw new AppError('A sessão mudou. Entre novamente.', { statusCode: 401, code: 'AUTHENTICATION_REQUIRED' })

  const link = new URL('/confirmar-email', frontendUrl)
  link.hash = new URLSearchParams({ token }).toString()
  try {
    await enviar({
      destinatario: novoEmail, assunto: 'LÉXIS: confirme seu novo e-mail',
      texto: `Confirme a troca de e-mail em até 30 minutos: ${link.href}\nSe não solicitou a troca, ignore a mensagem.`,
      chaveIdempotencia: `lexis-alteracao-email/${tokenHash}`,
    })
  } catch {
    await cancelarAlteracaoEmail({ tokenHash })
    throw new AppError('Não foi possível enviar o link de confirmação.', { statusCode: 503, code: 'EMAIL_CHANGE_DELIVERY_UNAVAILABLE' })
  }
  return { mensagem: 'Confira o novo endereço para confirmar a troca. Seu e-mail atual continua válido até a confirmação.' }
}

export async function confirmarAlteracaoEmail({ token }, {
  habilitado = env.EMAIL_ENABLED, ambiente = env.NODE_ENV, destinatarioDemo = env.EMAIL_DEMO_RECIPIENT,
  enviar = enviarEmailComResend, agora = () => new Date(),
} = {}) {
  const tokenHash = criarHashToken(token)
  const resultado = await consumirAlteracaoEmail({ tokenHash, agora })
  if (resultado.status === 'EM_USO') {
    await cancelarAlteracaoEmail({ tokenHash })
    throw erroEmailEmUso()
  }
  if (resultado.status !== 'ALTERADA') throw new AppError('Link inválido, expirado ou já utilizado.', {
    statusCode: 422, code: 'EMAIL_CHANGE_INVALID',
  })

  let avisoEmailAnteriorEnviado = false
  if (habilitado && podeEnviar(resultado.emailAnterior, ambiente, destinatarioDemo)) {
    try {
      await enviar({
        destinatario: resultado.emailAnterior, assunto: 'LÉXIS: o e-mail da sua conta foi alterado',
        texto: 'O endereço da sua conta foi alterado. Se você não reconhece essa alteração, fale com o suporte.',
        chaveIdempotencia: `lexis-aviso-email/${tokenHash}`,
      })
      avisoEmailAnteriorEnviado = true
    } catch {
      // A troca já foi confirmada. Uma falha do aviso não restaura credenciais antigas.
    }
  }
  return { avisoEmailAnteriorEnviado }
}
