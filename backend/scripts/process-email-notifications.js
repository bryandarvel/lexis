import { prisma } from '../src/config/prisma.js'
import { processarFilaRecuperacao } from '../src/modules/auth/password-recovery.service.js'
import {
  processarFilaEmailsNotificacao,
} from '../src/modules/notificacoes/notificacoes-email.service.js'

try {
  const recuperacao = await processarFilaRecuperacao()
  console.log(`Recuperação: ${recuperacao.processados}; enviados: ${recuperacao.enviados}; erros: ${recuperacao.erros}.`)
  const resumo = await processarFilaEmailsNotificacao()

  if (!resumo.habilitado) {
    console.log(
      'Envio de e-mail desativado. Defina EMAIL_ENABLED=true para a demonstração.',
    )
  } else {
    console.log(
      `Fila processada: ${resumo.processados}; enviados: ${resumo.enviados}; erros: ${resumo.erros}.`,
    )
  }

  if (resumo.erros > 0 || recuperacao.erros > 0) {
    process.exitCode = 1
  }
} catch {
  console.error(
    'Não foi possível processar a fila de e-mails. Verifique a configuração e o banco local.',
  )
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
