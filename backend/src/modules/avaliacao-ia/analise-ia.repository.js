import { prisma } from '../../config/prisma.js'

const analiseSelect = {
  id: true,
  redacaoId: true,
  solicitadaPorId: true,
  status: true,
  modelo: true,
  versaoPrompt: true,
  criteriosSnapshot: true,
  resultadoEstruturado: true,
  duracaoMs: true,
  mensagemErro: true,
  solicitadaEm: true,
  iniciadaEm: true,
  concluidaEm: true,
}

const redacaoParaAnaliseSelect = {
  id: true,
  texto: true,
  status: true,
  tema: {
    select: {
      id: true,
      enunciado: true,
      descricao: true,
      instrucoes: true,
      criterios: {
        select: {
          id: true,
          nome: true,
          descricao: true,
          ordem: true,
        },
        orderBy: {
          ordem: 'asc',
        },
      },
    },
  },
}

async function bloquearRedacao(
  transaction,
  redacaoId,
) {
  await transaction.$queryRaw`
    SELECT id
    FROM redacoes
    WHERE id = ${redacaoId}
    FOR UPDATE
  `
}

export function iniciarAnaliseIa({
  redacaoId,
  professorId,
  modelo,
  versaoPrompt,
  iniciadaEm,
}) {
  return prisma.$transaction(
    async (transaction) => {
      await bloquearRedacao(
        transaction,
        redacaoId,
      )

      const redacao =
        await transaction.redacao.findFirst({
          where: {
            id: redacaoId,
            status: {
              in: [
                'ENVIADA',
                'AVALIADA',
              ],
            },
            tema: {
              turma: {
                professorId,
              },
            },
          },
          select: redacaoParaAnaliseSelect,
        })

      if (!redacao) {
        return {
          status: 'REDACAO_INDISPONIVEL',
          redacao: null,
          analise: null,
        }
      }

      if (!redacao.texto?.trim()) {
        return {
          status: 'TEXTO_AUSENTE',
          redacao: null,
          analise: null,
        }
      }

      if (redacao.tema.criterios.length === 0) {
        return {
          status: 'CRITERIOS_AUSENTES',
          redacao: null,
          analise: null,
        }
      }

      const analiseEmAndamento =
        await transaction.analiseIA.findFirst({
          where: {
            redacaoId,
            status: 'PROCESSANDO',
          },
          select: {
            id: true,
          },
        })

      if (analiseEmAndamento) {
        return {
          status: 'ANALISE_EM_ANDAMENTO',
          redacao: null,
          analise: null,
        }
      }

      const criteriosSnapshot =
        redacao.tema.criterios.map(
          (criterio) => ({
            id: criterio.id,
            nome: criterio.nome,
            descricao: criterio.descricao,
            ordem: criterio.ordem,
          }),
        )

      const analise =
        await transaction.analiseIA.create({
          data: {
            redacaoId,
            solicitadaPorId: professorId,
            status: 'PROCESSANDO',
            modelo,
            versaoPrompt,
            criteriosSnapshot,
            iniciadaEm,
          },
          select: analiseSelect,
        })

      return {
        status: 'ANALISE_INICIADA',
        redacao,
        analise,
      }
    },
  )
}

export function concluirAnaliseIa({
  analiseId,
  resultadoEstruturado,
  duracaoMs,
  concluidaEm,
}) {
  return prisma.analiseIA.update({
    where: {
      id: analiseId,
    },
    data: {
      status: 'CONCLUIDA',
      resultadoEstruturado,
      duracaoMs,
      mensagemErro: null,
      concluidaEm,
    },
    select: analiseSelect,
  })
}

export function falharAnaliseIa({
  analiseId,
  mensagemErro,
  duracaoMs,
  concluidaEm,
}) {
  return prisma.analiseIA.update({
    where: {
      id: analiseId,
    },
    data: {
      status: 'ERRO',
      resultadoEstruturado: null,
      mensagemErro,
      duracaoMs,
      concluidaEm,
    },
    select: analiseSelect,
  })
}

export async function listarAnalisesIa({
  redacaoId,
  professorId,
}) {
  const redacao = await prisma.redacao.findFirst({
    where: {
      id: redacaoId,
      status: {
        in: [
          'ENVIADA',
          'AVALIADA',
        ],
      },
      tema: {
        turma: {
          professorId,
        },
      },
    },
    select: {
      id: true,
    },
  })

  if (!redacao) {
    return {
      status: 'REDACAO_INDISPONIVEL',
      analises: [],
    }
  }

  const analises = await prisma.analiseIA.findMany({
    where: {
      redacaoId,
    },
    select: analiseSelect,
    orderBy: {
      solicitadaEm: 'desc',
    },
  })

  return {
    status: 'ANALISES_ENCONTRADAS',
    analises,
  }
}
