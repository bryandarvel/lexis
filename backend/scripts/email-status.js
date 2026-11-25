import { validarBancoLocalEmail, resumirContagensEmail } from '../src/utils/email-operation.js'

let prisma
try {
  const { env } = await import('../src/config/env.js')
  const banco = validarBancoLocalEmail({
    ambiente: env.NODE_ENV,
    url: env.NODE_ENV === 'test' ? env.TEST_DATABASE_URL : env.DATABASE_URL,
  })
  const conexao = await import('../src/config/prisma.js')
  prisma = conexao.prisma
  const { contarEstadosNotificacoesEmail } = await import('../src/modules/notificacoes/notificacoes-email.repository.js')
  const { contarEstadosRecuperacoesEmail } = await import('../src/modules/auth/password-recovery.repository.js')
  const [notificacoes, recuperacoes] = await Promise.all([
    contarEstadosNotificacoesEmail(),
    contarEstadosRecuperacoesEmail(),
  ])
  console.log(JSON.stringify({
    banco,
    envioHabilitado: env.EMAIL_ENABLED,
    limitePorFila: env.EMAIL_BATCH_SIZE,
    notificacoes: resumirContagensEmail(notificacoes),
    recuperacoes: resumirContagensEmail(recuperacoes),
  }))
} catch {
  // Nunca imprimir exceções do ORM, URLs, contas ou credenciais.
  console.error('Não foi possível consultar as filas locais. Confira ambiente, destino e conexão.')
  process.exitCode = 1
} finally {
  try {
    await prisma?.$disconnect()
  } catch {
    console.error('Não foi possível encerrar a consulta local com segurança.')
    process.exitCode = 1
  }
}
