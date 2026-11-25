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

export function buscarUsuarioParaConfirmarSenha(id) {
  return prisma.usuario.findUnique({
    where: { id },
    select: { ...usuarioPublicoSelect, senhaHash: true, sessaoVersao: true },
  })
}

export function atualizarNomeUsuario({ usuarioId, nome, sessaoVersao, senhaHashEsperada }) {
  return prisma.$transaction(async tx => {
    const alteracao = await tx.usuario.updateMany({
      where: { id: usuarioId, ativo: true, sessaoVersao, senhaHash: senhaHashEsperada },
      data: { nome },
    })
    if (alteracao.count !== 1) return null
    return tx.usuario.findUnique({ where: { id: usuarioId }, select: usuarioPublicoSelect })
  })
}

export function excluirPropriaConta({ usuarioId, sessaoVersao, senhaHashEsperada, emailSubstituto, senhaHashSubstituta }) {
  return prisma.$transaction(async tx => {
    // Criação e reabertura de turma também adquirem a trava do professor.
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`
    const atual = await tx.usuario.findUnique({ where: { id: usuarioId } })
    if (!atual?.ativo || atual.sessaoVersao !== sessaoVersao || atual.senhaHash !== senhaHashEsperada) {
      return 'SESSAO_INVALIDA'
    }
    if (atual.papel === 'PROFESSOR' && await tx.turma.findFirst({
      where: { professorId: usuarioId, ativa: true }, select: { id: true },
    })) return 'TURMAS_ATIVAS'

    const agora = new Date()
    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        nome: 'Conta excluída', email: emailSubstituto, senhaHash: senhaHashSubstituta,
        ativo: false, desativadoEm: agora, sessaoVersao: { increment: 1 },
      },
    })
    await tx.refreshToken.deleteMany({ where: { usuarioId } })
    await tx.recuperacaoSenha.deleteMany({ where: { usuarioId } })
    await tx.alteracaoEmail.deleteMany({ where: { usuarioId } })
    await tx.notificacao.updateMany({
      where: { usuarioId, emailDestino: { not: null } },
      data: { emailDestino: null, proximaTentativaEm: null },
    })
    await tx.matricula.updateMany({
      where: { alunoId: usuarioId, status: 'ATIVA' },
      data: { status: 'ENCERRADA', encerradaEm: agora },
    })
    return 'EXCLUIDA'
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
