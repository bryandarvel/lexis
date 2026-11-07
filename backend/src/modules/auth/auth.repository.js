import { prisma } from '../../config/prisma.js'

const usuarioPublicoSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
}

export function buscarUsuarioPorEmail(email) {
  return prisma.usuario.findUnique({
    where: {
      email,
    },
  })
}

export function buscarUsuarioPublicoPorId(id) {
  return prisma.usuario.findUnique({
    where: {
      id,
    },
    select: usuarioPublicoSelect,
  })
}

export function buscarEstadoSessao(id) {
  return prisma.usuario.findUnique({ where: { id }, select: { ativo: true, papel: true, sessaoVersao: true } })
}

export function buscarUsuarioParaAlterarSenha(id) {
  return prisma.usuario.findUnique({
    where: { id },
    select: { ...usuarioPublicoSelect, senhaHash: true, sessaoVersao: true },
  })
}

export function atualizarNomeUsuario({ usuarioId, nome, sessaoVersao }) {
  return prisma.$transaction(async tx => {
    const alteracao = await tx.usuario.updateMany({
      where: { id: usuarioId, ativo: true, sessaoVersao },
      data: { nome },
    })
    if (alteracao.count !== 1) return null
    return tx.usuario.findUnique({ where: { id: usuarioId }, select: usuarioPublicoSelect })
  })
}

export function trocarSenhaComNovaSessao({ usuarioId, sessaoVersao, senhaHashEsperada, senhaHash, tokenHash, familiaId, expiraEm }) {
  return prisma.$transaction(async tx => {
    // Mesma ordem de login, refresh e recuperação: usuário antes das sessões.
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`
    const atual = await tx.usuario.findUnique({ where: { id: usuarioId } })
    if (!atual?.ativo || atual.sessaoVersao !== sessaoVersao || atual.senhaHash !== senhaHashEsperada) return null

    const usuario = await tx.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash, sessaoVersao: { increment: 1 } },
      select: usuarioPublicoSelect,
    })
    const agora = new Date()
    await tx.refreshToken.updateMany({ where: { usuarioId, revogadoEm: null }, data: { revogadoEm: agora } })
    await tx.recuperacaoSenha.updateMany({ where: { usuarioId, consumidoEm: null }, data: { consumidoEm: agora } })
    await tx.refreshToken.create({ data: { usuarioId, tokenHash, familiaId, expiraEm } })
    return usuario
  })
}

export function criarUsuario({
  nome,
  email,
  senhaHash,
  papel,
}) {
  return prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
      papel,
    },
    select: usuarioPublicoSelect,
  })
}

export function salvarRefreshToken({
  tokenHash,
  familiaId,
  usuarioId,
  expiraEm,
  sessaoVersao = 0,
  senhaHashEsperada,
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`
    const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } })
    if (!usuario?.ativo || usuario.sessaoVersao !== sessaoVersao || (senhaHashEsperada && usuario.senhaHash !== senhaHashEsperada)) return null
    return tx.refreshToken.create({ data: { tokenHash, familiaId, usuarioId, expiraEm } })
  })
}

export function buscarRefreshTokenPorHash(tokenHash) {
  return prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      usuario: true,
    },
  })
}

export function revogarFamiliaRefreshTokens(familiaId) {
  return prisma.refreshToken.updateMany({
    where: {
      familiaId,
      revogadoEm: null,
    },
    data: {
      revogadoEm: new Date(),
    },
  })
}

export function rotacionarRefreshToken({
  tokenAtualId,
  novoTokenHash,
  familiaId,
  usuarioId,
  expiraEm,
  sessaoVersao = 0,
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`
    const usuario = await transaction.usuario.findUnique({ where: { id: usuarioId }, select: { ativo: true, sessaoVersao: true } })
    if (!usuario?.ativo || usuario.sessaoVersao !== sessaoVersao) return false
    const resultado = await transaction.refreshToken.updateMany({
      where: {
        id: tokenAtualId,
        revogadoEm: null,
      },
      data: {
        revogadoEm: new Date(),
      },
    })

    if (resultado.count !== 1) {
      return false
    }

    await transaction.refreshToken.create({
      data: {
        tokenHash: novoTokenHash,
        familiaId,
        usuarioId,
        expiraEm,
      },
    })

    return true
  })
}
