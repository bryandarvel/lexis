import { randomBytes } from 'node:crypto'
import { env } from '../../config/env.js'
import { AppError } from '../../utils/app-error.js'
import { enviarEmailComResend } from '../../integrations/resend.client.js'
import { buscarUsuarioPorEmail } from './auth.repository.js'
import { criarHashToken } from './auth-token.service.js'
import { criarHashSenha } from './password.service.js'
import { concluirEnvioRecuperacao, consumirRecuperacao, enfileirarRecuperacao, registrarTokenRecuperacao, reservarRecuperacao } from './password-recovery.repository.js'

export async function solicitarRecuperacaoSenha({ email }, {
  habilitado = env.EMAIL_ENABLED, buscar = buscarUsuarioPorEmail, enfileirar = enfileirarRecuperacao,
  agora = () => new Date(), ttlMinutos = env.PASSWORD_RESET_TTL_MINUTES,
} = {}) {
  if (!habilitado) throw new AppError('Recuperação de senha temporariamente indisponível. Tente novamente mais tarde.', { statusCode: 503, code: 'PASSWORD_RECOVERY_UNAVAILABLE' })
  const usuario = await buscar(email)
  if (usuario?.ativo) {
    const instante = agora()
    await enfileirar({ usuarioId: usuario.id, agora: instante, expiraEm: new Date(instante.getTime() + ttlMinutos * 60000) })
  }
  return { mensagem: 'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.' }
}

export async function redefinirSenha({ token, senha }, { consumir = consumirRecuperacao, criarHash = criarHashSenha, agora = () => new Date() } = {}) {
  const senhaHash = await criarHash(senha)
  const sucesso = await consumir({ tokenHash: criarHashToken(token), senhaHash, agora: agora() })
  if (!sucesso) throw new AppError('Link inválido, expirado ou já utilizado. Solicite uma nova recuperação.', { statusCode: 422, code: 'PASSWORD_RESET_INVALID' })
}

export async function processarFilaRecuperacao({ limite = env.EMAIL_BATCH_SIZE } = {}, {
  habilitado = env.EMAIL_ENABLED, ambiente = env.NODE_ENV, destinatarioDemo = env.EMAIL_DEMO_RECIPIENT,
  frontendUrl = env.FRONTEND_URL, reservar = reservarRecuperacao, registrar = registrarTokenRecuperacao,
  concluir = concluirEnvioRecuperacao, enviar = enviarEmailComResend, agora = () => new Date(),
  gerarToken = () => randomBytes(32).toString('hex'),
} = {}) {
  const resumo = { habilitado, processados: 0, enviados: 0, erros: 0 }
  if (!habilitado) return resumo
  for (let i = 0; i < limite; i++) {
    const registro = await reservar({ agora: agora() })
    if (!registro) break
    resumo.processados++
    try {
      const email = registro.usuario.email.toLowerCase()
      // Em demonstração, nunca redirecionar o reset de uma conta real para outra pessoa.
      if (ambiente !== 'production' && email !== destinatarioDemo?.toLowerCase() && !email.endsWith('@lexis.example.com')) {
        throw new Error('Destinatário de demonstração incompatível.')
      }
      const token = gerarToken()
      if (!await registrar({ id: registro.id, tokenHash: criarHashToken(token), agora: agora() })) throw new Error('Solicitação indisponível.')
      const link = new URL('/redefinir-senha', frontendUrl)
      link.hash = new URLSearchParams({ token }).toString()
      await enviar({
        destinatario: ambiente === 'production' ? email : destinatarioDemo,
        assunto: 'LÉXIS — redefinição de senha',
        texto: `Para definir uma nova senha, acesse: ${link.href}\nO link é temporário e só pode ser usado uma vez. Se você não solicitou, ignore esta mensagem.`,
        chaveIdempotencia: `lexis-recuperacao/${registro.id}`,
      })
      await concluir({ id: registro.id, agora: agora(), sucesso: true })
      resumo.enviados++
    } catch {
      // Não guardar a exceção do provedor: ela pode conter o corpo do e-mail/link.
      await concluir({ id: registro.id, agora: agora(), sucesso: false })
      resumo.erros++
    }
  }
  return resumo
}
