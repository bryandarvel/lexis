import { prisma } from '../../config/prisma.js'

function criarFiltroVersoesPublicadas(alunoId) {
  return {
    status: 'PUBLICADA',
    feedback: {
      redacao: {
        alunoId,
      },
    },
  }
}

export async function buscarDesempenhoDoAluno({
  alunoId,
}) {
  const filtroPublicadas =
    criarFiltroVersoesPublicadas(alunoId)

  const [
    agregado,
    ultimaVersaoPublicada,
    totalEnviadas,
  ] = await Promise.all([
    prisma.feedbackVersao.aggregate({
      where: filtroPublicadas,
      _avg: {
        nota: true,
        competencia2: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.feedbackVersao.findFirst({
      where: filtroPublicadas,
      orderBy: [
        {
          publicadoEm: 'desc',
        },
        {
          atualizadoEm: 'desc',
        },
      ],
      select: {
        nota: true,
      },
    }),
    prisma.redacao.count({
      where: {
        alunoId,
        status: {
          not: 'RASCUNHO',
        },
      },
    }),
  ])

  return {
    mediaNota: agregado._avg.nota,
    mediaCompetencia2: agregado._avg.competencia2,
    ultimaNota: ultimaVersaoPublicada?.nota ?? null,
    totalEnviadas,
    totalCorrigidas: agregado._count._all,
  }
}
