import { prisma } from '../../config/prisma.js'

const notificacaoSelect = {
  id: true,
  usuarioId: true,
  feedbackVersaoId: true,
  tipo: true,
  titulo: true,
  mensagem: true,
  lidaEm: true,
  statusEmail: true,
  criadaEm: true,
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

export async function listarNotificacoesAluno({
  alunoId,
}) {
  const [notificacoes, totalNaoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where: {
        usuarioId: alunoId,
      },
      select: notificacaoSelect,
      orderBy: {
        criadaEm: 'desc',
      },
    }),
    prisma.notificacao.count({
      where: {
        usuarioId: alunoId,
        lidaEm: null,
      },
    }),
  ])

  return {
    notificacoes,
    totalNaoLidas,
  }
}

export async function marcarNotificacaoComoLida({
  notificacaoId,
  alunoId,
  lidaEm,
}) {
  const notificacao = await prisma.notificacao.findFirst({
    where: {
      id: notificacaoId,
      usuarioId: alunoId,
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

  const notificacaoAtualizada =
    await prisma.notificacao.update({
      where: {
        id: notificacaoId,
      },
      data: {
        lidaEm,
      },
      select: notificacaoSelect,
    })

  return {
    status: 'NOTIFICACAO_LIDA',
    notificacao: notificacaoAtualizada,
  }
}
