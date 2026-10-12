import { prisma } from '../../config/prisma.js'

export function enfileirarRecuperacao({ usuarioId, agora, expiraEm }) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`
    const recente = await tx.recuperacaoSenha.findFirst({ where: {
      usuarioId, criadoEm: { gt: new Date(agora.getTime() - 60000) },
    } })
    if (recente) return
    await tx.recuperacaoSenha.create({ data: { usuarioId, expiraEm, criadoEm: agora } })
  })
}

export async function reservarRecuperacao({ agora }) {
  const candidata = await prisma.recuperacaoSenha.findFirst({
    where: { statusEmail: 'PENDENTE', consumidoEm: null, expiraEm: { gt: agora }, usuario: { ativo: true } },
    orderBy: { criadoEm: 'asc' }, select: { id: true },
  })
  if (!candidata) return null
  const reserva = await prisma.recuperacaoSenha.updateMany({
    where: { id: candidata.id, statusEmail: 'PENDENTE', consumidoEm: null, expiraEm: { gt: agora } },
    data: { statusEmail: 'ENVIANDO' },
  })
  if (reserva.count !== 1) return null
  return prisma.recuperacaoSenha.findUnique({ where: { id: candidata.id }, include: { usuario: { select: { email: true, ativo: true } } } })
}

export async function registrarTokenRecuperacao({ id, tokenHash, agora }) {
  const resultado = await prisma.recuperacaoSenha.updateMany({
    where: { id, statusEmail: 'ENVIANDO', consumidoEm: null, expiraEm: { gt: agora } }, data: { tokenHash },
  })
  return resultado.count === 1
}

export function concluirEnvioRecuperacao({ id, agora, sucesso }) {
  return prisma.recuperacaoSenha.updateMany({
    where: { id, statusEmail: 'ENVIANDO' },
    data: sucesso ? { statusEmail: 'ENVIADO', enviadoEm: agora } : {
      statusEmail: 'ERRO', consumidoEm: agora, tokenHash: null, erroCodigo: 'PASSWORD_RECOVERY_EMAIL_FAILED',
    },
  })
}

export async function consumirRecuperacao({ tokenHash, senhaHash, agora }) {
  const registro = await prisma.recuperacaoSenha.findUnique({ where: { tokenHash }, select: { usuarioId: true } })
  if (!registro) return false
  return prisma.$transaction(async (tx) => {
    // A mesma trava serializa redefinições, login e refresh desse usuário.
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${registro.usuarioId} FOR UPDATE`
    const consumida = await tx.recuperacaoSenha.updateMany({
      where: { tokenHash, consumidoEm: null, expiraEm: { gt: agora }, statusEmail: { in: ['ENVIANDO', 'ENVIADO'] }, usuario: { ativo: true } },
      data: { consumidoEm: agora },
    })
    if (consumida.count !== 1) return false
    await tx.usuario.update({ where: { id: registro.usuarioId }, data: { senhaHash, sessaoVersao: { increment: 1 } } })
    await tx.refreshToken.updateMany({ where: { usuarioId: registro.usuarioId, revogadoEm: null }, data: { revogadoEm: agora } })
    await tx.recuperacaoSenha.updateMany({ where: { usuarioId: registro.usuarioId, consumidoEm: null }, data: { consumidoEm: agora } })
    return true
  })
}
