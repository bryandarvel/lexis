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
}) {
  return prisma.refreshToken.create({
    data: {
      tokenHash,
      familiaId,
      usuarioId,
      expiraEm,
    },
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
}) {
  return prisma.$transaction(async (transaction) => {
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