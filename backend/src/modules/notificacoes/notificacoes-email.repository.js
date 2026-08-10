import { prisma } from '../../config/prisma.js'

const notificacaoEmailSelect = {
  id: true,
  emailDestino: true,
  tipo: true,
  titulo: true,
  mensagem: true,
  statusEmail: true,
  tentativasEmail: true,
  feedbackVersao: {
    select: {
      feedback: {
        select: {
          redacaoId: true,
        },
      },
    },
  },
}

function criarFiltroDisponibilidade({
  agora,
  maxTentativas,
}) {
  return {
    tentativasEmail: {
      lt: maxTentativas,
    },
    OR: [
      {
        statusEmail: 'PENDENTE',
      },
      {
        statusEmail: 'ERRO',
        OR: [
          {
            proximaTentativaEm: null,
          },
          {
            proximaTentativaEm: {
              lte: agora,
            },
          },
        ],
      },
    ],
  }
}

export async function reservarProximaNotificacaoEmail({
  agora,
  maxTentativas,
}) {
  const filtro = criarFiltroDisponibilidade({
    agora,
    maxTentativas,
  })
  const candidata = await prisma.notificacao.findFirst({
    where: filtro,
    select: {
      id: true,
    },
    orderBy: {
      criadaEm: 'asc',
    },
  })

  if (!candidata) {
    return null
  }

  const reserva = await prisma.notificacao.updateMany({
    where: {
      id: candidata.id,
      ...filtro,
    },
    data: {
      statusEmail: 'ENVIANDO',
      tentativasEmail: {
        increment: 1,
      },
      proximaTentativaEm: null,
      ultimoErroEmail: null,
    },
  })

  if (reserva.count !== 1) {
    return null
  }

  return prisma.notificacao.findUnique({
    where: {
      id: candidata.id,
    },
    select: notificacaoEmailSelect,
  })
}

export function registrarNotificacaoEmailEnviada({
  notificacaoId,
  enviadaEm,
}) {
  return prisma.notificacao.update({
    where: {
      id: notificacaoId,
    },
    data: {
      statusEmail: 'ENVIADO',
      emailEnviadoEm: enviadaEm,
      proximaTentativaEm: null,
      ultimoErroEmail: null,
    },
    select: notificacaoEmailSelect,
  })
}

export function registrarFalhaNotificacaoEmail({
  notificacaoId,
  erro,
  proximaTentativaEm,
}) {
  return prisma.notificacao.update({
    where: {
      id: notificacaoId,
    },
    data: {
      statusEmail: 'ERRO',
      ultimoErroEmail: erro,
      proximaTentativaEm,
    },
    select: notificacaoEmailSelect,
  })
}
