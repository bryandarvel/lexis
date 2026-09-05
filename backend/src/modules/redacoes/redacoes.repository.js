import { prisma } from '../../config/prisma.js'

const professorResumoSelect = {
  id: true,
  nome: true,
}

const turmaResumoSelect = {
  id: true,
  nome: true,
  professor: {
    select: professorResumoSelect,
  },
}

const temaResumoSelect = {
  id: true,
  enunciado: true,
  prazoEntrega: true,
  ativo: true,
  turma: {
    select: turmaResumoSelect,
  },
}

const redacaoAlunoSelect = {
  id: true,
  alunoId: true,
  temaId: true,
  texto: true,
  origemTexto: true,
  ocrRevisadoEm: true,
  status: true,
  enviadaEm: true,
  prazoConsideradoEm: true,
  enviadaComAtraso: true,
  criadoEm: true,
  atualizadoEm: true,
  tema: {
    select: temaResumoSelect,
  },
}

const redacaoProfessorResumoSelect = {
  id: true,
  temaId: true,
  origemTexto: true,
  status: true,
  enviadaEm: true,
  prazoConsideradoEm: true,
  enviadaComAtraso: true,
  criadoEm: true,
  atualizadoEm: true,
  aluno: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
  tema: {
    select: {
      id: true,
      enunciado: true,
      prazoEntrega: true,
    },
  },
}

const redacaoProfessorDetalhadaSelect = {
  ...redacaoProfessorResumoSelect,
  texto: true,
  ocrRevisadoEm: true,
  tema: {
    select: {
      ...temaResumoSelect,
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

async function bloquearTema(
  transaction,
  temaId,
) {
  await transaction.$queryRaw`
    SELECT id
    FROM temas_redacao
    WHERE id = ${temaId}
    FOR UPDATE
  `
}

function buscarTemaDisponivelParaAluno(
  transaction,
  {
    temaId,
    alunoId,
  },
) {
  return transaction.temaRedacao.findFirst({
    where: {
      id: temaId,
      ativo: true,
      turma: {
        ativa: true,
        matriculas: {
          some: {
            alunoId,
            status: 'ATIVA',
          },
        },
      },
    },
    select: {
      id: true,
      prazoEntrega: true,
      criteriosBloqueadosEm: true,
    },
  })
}

function buscarRedacaoExistente(
  transaction,
  {
    temaId,
    alunoId,
  },
) {
  return transaction.redacao.findUnique({
    where: {
      alunoId_temaId: {
        alunoId,
        temaId,
      },
    },
    select: {
      id: true,
      texto: true,
      origemTexto: true,
      ocrRevisadoEm: true,
      status: true,
    },
  })
}

export async function verificarDisponibilidadeRascunhoOcr({
  temaId,
  alunoId,
}) {
  const tema = await buscarTemaDisponivelParaAluno(
    prisma,
    {
      temaId,
      alunoId,
    },
  )

  if (!tema) {
    return {
      status: 'TEMA_INDISPONIVEL',
    }
  }

  const redacaoExistente =
    await buscarRedacaoExistente(prisma, {
      temaId,
      alunoId,
    })

  if (
    redacaoExistente &&
    redacaoExistente.status !== 'RASCUNHO'
  ) {
    return {
      status: 'REDACAO_IMUTAVEL',
    }
  }

  return {
    status: 'DISPONIVEL',
  }
}

export function salvarRascunhoDigitado({
  temaId,
  alunoId,
  texto,
  revisadaEm = new Date(),
}) {
  return prisma.$transaction(
    async (transaction) => {
      await bloquearTema(transaction, temaId)

      const tema =
        await buscarTemaDisponivelParaAluno(
          transaction,
          {
            temaId,
            alunoId,
          },
        )

      if (!tema) {
        return {
          status: 'TEMA_INDISPONIVEL',
          redacao: null,
        }
      }

      const redacaoExistente =
        await buscarRedacaoExistente(transaction, {
          temaId,
          alunoId,
        })

      if (
        redacaoExistente &&
        redacaoExistente.status !== 'RASCUNHO'
      ) {
        return {
          status: 'REDACAO_IMUTAVEL',
          redacao: null,
        }
      }

      const redacao = redacaoExistente
        ? await transaction.redacao.update({
            where: {
              id: redacaoExistente.id,
            },
            data: {
              texto,
              ocrRevisadoEm:
                redacaoExistente.origemTexto === 'OCR'
                  ? revisadaEm
                  : undefined,
            },
            select: redacaoAlunoSelect,
          })
        : await transaction.redacao.create({
            data: {
              alunoId,
              temaId,
              texto,
              origemTexto: 'DIGITADO',
              status: 'RASCUNHO',
            },
            select: redacaoAlunoSelect,
          })

      return {
        status: 'RASCUNHO_SALVO',
        redacao,
      }
    },
  )
}

export function salvarRascunhoOcr({
  temaId,
  alunoId,
  texto,
  revisadaEm,
}) {
  return prisma.$transaction(
    async (transaction) => {
      await bloquearTema(transaction, temaId)

      const tema =
        await buscarTemaDisponivelParaAluno(
          transaction,
          {
            temaId,
            alunoId,
          },
        )

      if (!tema) {
        return {
          status: 'TEMA_INDISPONIVEL',
          redacao: null,
        }
      }

      const redacaoExistente =
        await buscarRedacaoExistente(transaction, {
          temaId,
          alunoId,
        })

      if (
        redacaoExistente &&
        redacaoExistente.status !== 'RASCUNHO'
      ) {
        return {
          status: 'REDACAO_IMUTAVEL',
          redacao: null,
        }
      }

      const dadosOcr = {
        texto,
        origemTexto: 'OCR',
        ocrRevisadoEm: revisadaEm,
        status: 'RASCUNHO',
      }

      const redacao = redacaoExistente
        ? await transaction.redacao.update({
            where: {
              id: redacaoExistente.id,
            },
            data: dadosOcr,
            select: redacaoAlunoSelect,
          })
        : await transaction.redacao.create({
            data: {
              alunoId,
              temaId,
              ...dadosOcr,
            },
            select: redacaoAlunoSelect,
          })

      return {
        status: 'RASCUNHO_OCR_SALVO',
        redacao,
      }
    },
  )
}

export function enviarRedacaoDoAluno({
  temaId,
  alunoId,
  enviadaEm,
}) {
  return prisma.$transaction(
    async (transaction) => {
      await bloquearTema(transaction, temaId)

      const tema =
        await buscarTemaDisponivelParaAluno(
          transaction,
          {
            temaId,
            alunoId,
          },
        )

      if (!tema) {
        return {
          status: 'TEMA_INDISPONIVEL',
          redacao: null,
        }
      }

      const redacaoExistente =
        await buscarRedacaoExistente(transaction, {
          temaId,
          alunoId,
        })

      if (!redacaoExistente) {
        return {
          status: 'RASCUNHO_INEXISTENTE',
          redacao: null,
        }
      }

      if (redacaoExistente.status !== 'RASCUNHO') {
        return {
          status: 'REDACAO_IMUTAVEL',
          redacao: null,
        }
      }

      if (!redacaoExistente.texto?.trim()) {
        return {
          status: 'TEXTO_AUSENTE',
          redacao: null,
        }
      }

      if (
        redacaoExistente.origemTexto === 'OCR' &&
        !redacaoExistente.ocrRevisadoEm
      ) {
        return {
          status: 'OCR_NAO_REVISADO',
          redacao: null,
        }
      }

      const enviadaComAtraso =
        enviadaEm.getTime() >
        tema.prazoEntrega.getTime()

      const redacao =
        await transaction.redacao.update({
          where: {
            id: redacaoExistente.id,
          },
          data: {
            status: 'ENVIADA',
            enviadaEm,
            prazoConsideradoEm:
              tema.prazoEntrega,
            enviadaComAtraso,
          },
          select: redacaoAlunoSelect,
        })

      await transaction.temaRedacao.updateMany({
        where: {
          id: temaId,
          criteriosBloqueadosEm: null,
        },
        data: {
          criteriosBloqueadosEm: enviadaEm,
        },
      })

      return {
        status: 'REDACAO_ENVIADA',
        redacao,
      }
    },
  )
}

export function listarRedacoesDoAluno(alunoId) {
  return prisma.redacao.findMany({
    where: {
      alunoId,
    },
    select: redacaoAlunoSelect,
    orderBy: {
      atualizadoEm: 'desc',
    },
  })
}

export function buscarRedacaoDoAluno({
  redacaoId,
  alunoId,
}) {
  return prisma.redacao.findFirst({
    where: {
      id: redacaoId,
      alunoId,
    },
    select: redacaoAlunoSelect,
  })
}

export function buscarTurmaDoProfessor({
  turmaId,
  professorId,
}) {
  return prisma.turma.findFirst({
    where: {
      id: turmaId,
      professorId,
    },
    select: {
      id: true,
      ativa: true,
    },
  })
}

export function listarRedacoesDaTurmaDoProfessor({
  turmaId,
  professorId,
  temaId,
  status,
}) {
  return prisma.redacao.findMany({
    where: {
      temaId: temaId ?? undefined,
      status:
        status ??
        {
          in: [
            'ENVIADA',
            'AVALIADA',
          ],
        },
      tema: {
        turmaId,
        turma: {
          professorId,
        },
      },
    },
    select: redacaoProfessorResumoSelect,
    orderBy: [
      {
        enviadaEm: 'desc',
      },
      {
        atualizadoEm: 'desc',
      },
    ],
  })
}

export function buscarRedacaoDoProfessor({
  redacaoId,
  professorId,
}) {
  return prisma.redacao.findFirst({
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
    select: redacaoProfessorDetalhadaSelect,
  })
}
