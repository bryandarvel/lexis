import { prisma } from '../src/config/prisma.js'
import {
  processarFilaEmailsNotificacao,
} from '../src/modules/notificacoes/notificacoes-email.service.js'

try {
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

  if (resumo.erros > 0) {
    process.exitCode = 1
  }
} catch (erro) {
  console.error(
    `Não foi possível processar a fila de e-mails: ${erro.message}`,
  )
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
