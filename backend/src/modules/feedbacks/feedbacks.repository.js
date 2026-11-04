import { prisma } from '../../config/prisma.js'

import {
  calcularNotaTotalCompetencias,
  CAMPOS_COMPETENCIAS,
  extrairCompetencias,
} from './feedbacks.competencias.js'
import { coincideComEvidenciaIa, trechoLiteralValido } from './feedbacks.trechos.js'

const trechoSelect = {
  id: true, inicio: true, fim: true, trecho: true, sugeridoPorIa: true, analiseIaId: true,
}
const trechosSelect = { select: trechoSelect, orderBy: [{ inicio: 'asc' }, { fim: 'asc' }] }

const feedbackVersaoSelect = {
  id: true,
  feedbackId: true,
  numero: true,
  professorId: true,
  nota: true,
  competencia1: true,
  competencia2: true,
  competencia3: true,
  competencia4: true,
  competencia5: true,
  comentarioGeral: true,
  status: true,
  publicadoEm: true,
  criadoEm: true,
  atualizadoEm: true,
  criterios: {
    select: {
      id: true,
      criterioId: true,
      comentario: true,
      trechos: trechosSelect,
      criterio: {
        select: {
          nome: true,
          descricao: true,
          ordem: true,
        },
      },
    },
    orderBy: {
      criterio: {
        ordem: 'asc',
      },
    },
  },
}

// O aluno recebe só a decisão publicada, nunca o ID/JSON privado da análise.
const { analiseIaId: _analisePrivada, ...trechoAlunoSelect } = trechoSelect
const feedbackVersaoAlunoSelect = {
  ...feedbackVersaoSelect,
  criterios: {
    ...feedbackVersaoSelect.criterios,
    select: {
      ...feedbackVersaoSelect.criterios.select,
      trechos: { ...trechosSelect, select: trechoAlunoSelect },
    },
  },
}

const notificacaoSelect = {
  id: true,
  usuarioId: true,
  feedbackVersaoId: true,
  tipo: true,
  titulo: true,
  mensagem: true,
  lidaEm: true,
  emailDestino: true,
  statusEmail: true,
  tentativasEmail: true,
  emailEnviadoEm: true,
  proximaTentativaEm: true,
  criadaEm: true,
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

function buscarRedacaoDoProfessor(
  transaction,
  {
    redacaoId,
    professorId,
  },
) {
  return transaction.redacao.findFirst({
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
      texto: true,
      aluno: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      tema: {
        select: {
          criterios: {
            select: {
              id: true,
              nome: true,
              ordem: true,
            },
          },
        },
      },
    },
  })
}

function criteriosPertencemAoTema(
  redacao,
  criterios,
) {
  const criteriosDoTema = new Set(
    redacao.tema.criterios.map(
      (criterio) => criterio.id,
    ),
  )

  return criterios.every((criterio) =>
    criteriosDoTema.has(criterio.criterioId),
  )
}

function criarDadosCriterios(criterios) {
  return criterios.map((criterio) => ({
    criterioId: criterio.criterioId,
    comentario: criterio.comentario,
    trechos: { create: criterio.trechos },
  }))
}

async function prepararCriteriosComTrechos(transaction, redacao, criterios, versaoBase) {
  const idsAnalises = [...new Set(criterios.flatMap(c => (c.trechos ??
    versaoBase?.criterios.find(base => base.criterioId === c.criterioId)?.trechos ?? [])
    .flatMap(t => t.analiseIaId ? [t.analiseIaId] : [])))]
  const analises = idsAnalises.length ? await transaction.analiseIA.findMany({
    where: { id: { in: idsAnalises }, redacaoId: redacao.id, status: 'CONCLUIDA' },
    select: { id: true, criteriosSnapshot: true, resultadoEstruturado: true },
  }) : []
  if (analises.length !== idsAnalises.length) return { status: 'ANALISE_INVALIDA' }
  const preparados = []
  for (const comentario of criterios) {
    const criterio = redacao.tema.criterios.find(c => c.id === comentario.criterioId)
    const trechos = comentario.trechos ?? versaoBase?.criterios.find(c => c.criterioId === comentario.criterioId)?.trechos ?? []
    if (trechos.some(t => !trechoLiteralValido(redacao.texto, t))) return { status: 'TRECHOS_INVALIDOS' }
    preparados.push({ ...comentario, trechos: trechos.map(t => {
      const analise = analises.find(a => a.id === t.analiseIaId)
      const sugeridoPorIa = coincideComEvidenciaIa(analise, criterio, t)
      return { inicio: t.inicio, fim: t.fim, trecho: t.trecho, sugeridoPorIa, analiseIaId: sugeridoPorIa ? analise.id : null }
    }) })
  }
  return { status: 'TRECHOS_VALIDOS', criterios: preparados }
}

export function salvarFeedbackRascunho(dados) {
  const {
    redacaoId,
    professorId,
    comentarioGeral,
    criterios,
  } = dados
  const competencias = extrairCompetencias(dados)
  const nota =
    calcularNotaTotalCompetencias(competencias)

  return prisma.$transaction(
    async (transaction) => {
      await bloquearRedacao(transaction, redacaoId)

      const redacao = await buscarRedacaoDoProfessor(
        transaction,
        {
          redacaoId,
          professorId,
        },
      )

      if (!redacao) {
        return {
          status: 'REDACAO_INDISPONIVEL',
          feedbackVersao: null,
        }
      }

      if (!criteriosPertencemAoTema(redacao, criterios)) {
        return {
          status: 'CRITERIOS_INVALIDOS',
          feedbackVersao: null,
        }
      }

      const rascunhoExistente = await transaction.feedbackVersao.findFirst({
        where: { feedback: { redacaoId }, status: 'RASCUNHO' },
        orderBy: { numero: 'desc' },
        select: { id: true, criterios: { select: { criterioId: true, trechos: trechosSelect } } },
      })
      const versaoBase = rascunhoExistente ?? await transaction.feedbackVersao.findFirst({
        where: { feedback: { redacaoId }, status: 'PUBLICADA' },
        orderBy: { numero: 'desc' },
        select: { criterios: { select: { criterioId: true, trechos: trechosSelect } } },
      })
      const preparados = await prepararCriteriosComTrechos(transaction, redacao, criterios, versaoBase)
      if (preparados.status !== 'TRECHOS_VALIDOS') return { status: preparados.status, feedbackVersao: null }

      const feedback = await transaction.feedback.upsert({
        where: {
          redacaoId,
        },
        create: {
          redacaoId,
        },
        update: {},
        select: {
          id: true,
        },
      })

      const dadosCriterios =
        criarDadosCriterios(preparados.criterios)

      if (rascunhoExistente) {
        const feedbackVersao =
          await transaction.feedbackVersao.update({
            where: {
              id: rascunhoExistente.id,
            },
            data: {
              nota,
              ...competencias,
              comentarioGeral,
              criterios: {
                deleteMany: {},
                create: dadosCriterios,
              },
            },
            select: feedbackVersaoSelect,
          })

        return {
          status: 'RASCUNHO_SALVO',
          feedbackVersao,
        }
      }

      const ultimaVersao =
        await transaction.feedbackVersao.findFirst({
          where: {
            feedbackId: feedback.id,
          },
          orderBy: {
            numero: 'desc',
          },
          select: {
            numero: true,
          },
        })

      const feedbackVersao =
        await transaction.feedbackVersao.create({
          data: {
            feedbackId: feedback.id,
            numero: (ultimaVersao?.numero ?? 0) + 1,
            professorId,
            nota,
            ...competencias,
            comentarioGeral,
            status: 'RASCUNHO',
            criterios: {
              create: dadosCriterios,
            },
          },
          select: feedbackVersaoSelect,
        })

      return {
        status: 'RASCUNHO_SALVO',
        feedbackVersao,
      }
    },
  )
}

export async function consultarFeedback({
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
      feedback: null,
    }
  }

  const feedback = await prisma.feedback.findUnique({
    where: {
      redacaoId,
    },
    select: {
      id: true,
      redacaoId: true,
      criadoEm: true,
      atualizadoEm: true,
      versoes: {
        select: feedbackVersaoSelect,
        orderBy: {
          numero: 'desc',
        },
      },
    },
  })

  return {
    status: 'FEEDBACK_CONSULTADO',
    feedback,
  }
}

export function publicarFeedback({
  redacaoId,
  professorId,
  publicadoEm,
}) {
  return prisma.$transaction(
    async (transaction) => {
      await bloquearRedacao(transaction, redacaoId)

      const redacao = await buscarRedacaoDoProfessor(
        transaction,
        {
          redacaoId,
          professorId,
        },
      )

      if (!redacao) {
        return {
          status: 'REDACAO_INDISPONIVEL',
          feedbackVersao: null,
          notificacao: null,
        }
      }

      const feedback = await transaction.feedback.findUnique({
        where: {
          redacaoId,
        },
        select: {
          id: true,
          versoes: {
            where: {
              status: 'RASCUNHO',
            },
            orderBy: {
              numero: 'desc',
            },
            take: 1,
            select: {
              id: true,
              nota: true,
              competencia1: true,
              competencia2: true,
              competencia3: true,
              competencia4: true,
              competencia5: true,
              comentarioGeral: true,
              criterios: { select: { trechos: trechosSelect } },
            },
          },
        },
      })

      const rascunho = feedback?.versoes[0]

      if (!rascunho) {
        return {
          status: 'RASCUNHO_AUSENTE',
          feedbackVersao: null,
          notificacao: null,
        }
      }

      const camposPendentes = []

      CAMPOS_COMPETENCIAS.forEach((campo) => {
        if (rascunho[campo] === null) {
          camposPendentes.push(campo)
        }
      })

      if (!rascunho.comentarioGeral?.trim()) {
        camposPendentes.push('comentarioGeral')
      }

      if (camposPendentes.length > 0) {
        return {
          status: 'RASCUNHO_INCOMPLETO',
          camposPendentes,
          feedbackVersao: null,
          notificacao: null,
        }
      }

      if (rascunho.criterios.some(c => c.trechos.some(t => !trechoLiteralValido(redacao.texto, t)))) {
        return { status: 'TRECHOS_INVALIDOS', feedbackVersao: null, notificacao: null }
      }

      const versaoPublicadaAnterior =
        await transaction.feedbackVersao.findFirst({
          where: {
            feedbackId: feedback.id,
            status: 'PUBLICADA',
          },
          select: {
            id: true,
          },
        })

      if (versaoPublicadaAnterior) {
        await transaction.feedbackVersao.updateMany({
          where: {
            feedbackId: feedback.id,
            status: 'PUBLICADA',
          },
          data: {
            status: 'SUBSTITUIDA',
          },
        })
      }

      const feedbackVersao =
        await transaction.feedbackVersao.update({
          where: {
            id: rascunho.id,
          },
          data: {
            status: 'PUBLICADA',
            publicadoEm,
          },
          select: feedbackVersaoSelect,
        })

      await transaction.redacao.update({
        where: {
          id: redacaoId,
        },
        data: {
          status: 'AVALIADA',
        },
      })

      const corrigida = Boolean(versaoPublicadaAnterior)
      const notificacao = await transaction.notificacao.create({
        data: {
          usuarioId: redacao.aluno.id,
          feedbackVersaoId: feedbackVersao.id,
          tipo: corrigida
            ? 'FEEDBACK_CORRIGIDO'
            : 'FEEDBACK_PUBLICADO',
          titulo: corrigida
            ? 'Correção atualizada'
            : 'Correção disponível',
          mensagem: corrigida
            ? 'A correção da sua redação foi atualizada pelo professor.'
            : 'A correção da sua redação está disponível.',
          emailDestino: redacao.aluno.email,
          statusEmail: 'PENDENTE',
        },
        select: notificacaoSelect,
      })

      return {
        status: 'FEEDBACK_PUBLICADO',
        feedbackVersao,
        notificacao,
      }
    },
  )
}

export async function consultarFeedbackPublicadoAluno({
  redacaoId,
  alunoId,
}) {
  const redacao = await prisma.redacao.findFirst({
    where: {
      id: redacaoId,
      alunoId,
    },
    select: {
      id: true,
      status: true,
      feedback: {
        select: {
          versoes: {
            where: {
              status: 'PUBLICADA',
            },
            orderBy: {
              numero: 'desc',
            },
            take: 1,
            select: feedbackVersaoAlunoSelect,
          },
        },
      },
    },
  })

  if (!redacao) {
    return {
      status: 'REDACAO_INDISPONIVEL',
      feedbackVersao: null,
    }
  }

  const feedbackVersao =
    redacao.feedback?.versoes[0] ?? null

  if (redacao.status !== 'AVALIADA' || !feedbackVersao) {
    return {
      status: 'FEEDBACK_INDISPONIVEL',
      feedbackVersao: null,
    }
  }

  return {
    status: 'FEEDBACK_PUBLICADO_ENCONTRADO',
    feedbackVersao,
  }
}
