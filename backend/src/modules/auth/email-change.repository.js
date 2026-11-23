import { prisma } from '../../config/prisma.js'

export async function registrarAlteracaoEmail({ usuarioId, sessaoVersao, senhaHashEsperada, novoEmail, tokenHash, expiraEm }) {
  return prisma.$transaction(async tx => {
    const [usuario] = await tx.$queryRaw`SELECT ativo, email, sessaoVersao, senhaHash FROM usuarios
      WHERE id = ${usuarioId} FOR UPDATE`
    if (!usuario?.ativo || usuario.sessaoVersao !== sessaoVersao || usuario.senhaHash !== senhaHashEsperada) {
      return 'SESSAO_INVALIDA'
    }
    const dono = await tx.usuario.findUnique({ where: { email: novoEmail }, select: { id: true } })
    if (dono?.id === usuarioId) return 'IGUAL'
    if (dono) return 'EM_USO'
    const dados = { novoEmail, tokenHash, sessaoVersao, expiraEm }
    await tx.alteracaoEmail.upsert({ where: { usuarioId }, create: { usuarioId, ...dados }, update: dados })
    return 'REGISTRADA'
  })
}

export function cancelarAlteracaoEmail({ tokenHash }) {
  return prisma.alteracaoEmail.deleteMany({ where: { tokenHash } })
}

export async function consumirAlteracaoEmail({ tokenHash, agora = () => new Date() }) {
  const registro = await prisma.alteracaoEmail.findUnique({ where: { tokenHash }, select: { usuarioId: true } })
  if (!registro) return { status: 'INVALIDA' }
  const { usuarioId } = registro
  try {
    return await prisma.$transaction(async tx => {
      const [usuario] = await tx.$queryRaw`SELECT ativo, email, sessaoVersao FROM usuarios
        WHERE id = ${usuarioId} FOR UPDATE`
      const pendente = await tx.alteracaoEmail.findUnique({ where: { usuarioId } })
      const instante = agora()
      if (!usuario?.ativo || pendente?.tokenHash !== tokenHash ||
          pendente.sessaoVersao !== usuario.sessaoVersao || pendente.expiraEm <= instante) return { status: 'INVALIDA' }
      // O índice UNIQUE do usuário arbitra confirmações e cadastros concorrentes.
      await tx.usuario.update({ where: { id: usuarioId }, data: {
        email: pendente.novoEmail, sessaoVersao: { increment: 1 },
      } })
      await tx.refreshToken.updateMany({ where: { usuarioId, revogadoEm: null }, data: { revogadoEm: instante } })
      await tx.recuperacaoSenha.updateMany({ where: { usuarioId, consumidoEm: null }, data: { consumidoEm: instante, tokenHash: null } })
      await tx.notificacao.updateMany({ where: { usuarioId, emailDestino: usuario.email },
        data: { emailDestino: null, proximaTentativaEm: null } })
      await tx.alteracaoEmail.delete({ where: { usuarioId } })
      return { status: 'ALTERADA', emailAnterior: usuario.email }
    })
  } catch (error) {
    if (error.code === 'P2002') return { status: 'EM_USO' }
    throw error
  }
}
