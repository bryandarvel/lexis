import { prisma } from '../../config/prisma.js'

const notificacaoSelect = {
  id: true,
  usuarioId: true,
  feedbackVersaoId: true,
  redacaoId: true,
  tipo: true,
  titulo: true,
  mensagem: true,
  lidaEm: true,
  statusEmail: true,
  criadaEm: true,
  redacao: {
    select: {
      id: true,
      tema: { select: { id: true, enunciado: true, turma: { select: { id: true, nome: true } } } },
    },
  },
  feedbackVersao: {
    select: {
      numero: true,
      feedback: {
        select: {
          redacaoId: true,
        },
      },
    },
  },
}

async function listarNotificacoesUsuario({
  usuarioId,
}) {
  const [notificacoes, totalNaoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where: {
        usuarioId,
      },
      select: notificacaoSelect,
      orderBy: {
        criadaEm: 'desc',
      },
    }),
    prisma.notificacao.count({
      where: {
        usuarioId,
        lidaEm: null,
      },
    }),
  ])

  return {
    notificacoes,
    totalNaoLidas,
  }
}

async function marcarNotificacaoUsuarioComoLida({
  notificacaoId,
  usuarioId,
  lidaEm,
}) {
  const notificacao = await prisma.notificacao.findFirst({
    where: {
      id: notificacaoId,
      usuarioId,
    },
    select: notificacaoSelect,
  })

  if (!notificacao) {
    return {
      status: 'NOTIFICACAO_INDISPONIVEL',
      notificacao: null,
    }
  }

  if (notificacao.lidaEm) {
    return {
      status: 'NOTIFICACAO_LIDA',
      notificacao,
    }
  }

  await prisma.notificacao.updateMany({
    where: {
      id: notificacaoId,
      usuarioId,
      lidaEm: null,
    },
    data: {
      lidaEm,
    },
  })

  const notificacaoAtualizada = await prisma.notificacao.findFirst({
    where: { id: notificacaoId, usuarioId },
    select: notificacaoSelect,
  })

  return {
    status: 'NOTIFICACAO_LIDA',
    notificacao: notificacaoAtualizada,
  }
}

export function listarNotificacoesAluno({ alunoId }) {
  return listarNotificacoesUsuario({ usuarioId: alunoId })
}

export function listarNotificacoesProfessor({ professorId }) {
  return listarNotificacoesUsuario({ usuarioId: professorId })
}

export function marcarNotificacaoComoLida({ alunoId, ...dados }) {
  return marcarNotificacaoUsuarioComoLida({ ...dados, usuarioId: alunoId })
}

export function marcarNotificacaoProfessorComoLida({ professorId, ...dados }) {
  return marcarNotificacaoUsuarioComoLida({ ...dados, usuarioId: professorId })
}
