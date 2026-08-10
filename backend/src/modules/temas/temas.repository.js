import { prisma } from '../../config/prisma.js'

const criterioSelect = {
  id: true,
  nome: true,
  descricao: true,
  ordem: true,
  criadoEm: true,
  atualizadoEm: true,
}

const temaDetalhadoSelect = {
  id: true,
  turmaId: true,
  enunciado: true,
  descricao: true,
  instrucoes: true,
  prazoEntrega: true,
  ativo: true,
  arquivadoEm: true,
  criteriosBloqueadosEm: true,
  criadoEm: true,
  atualizadoEm: true,
  turma: {
    select: {
      id: true,
      nome: true,
      professor: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  },
  criterios: {
    select: criterioSelect,
    orderBy: {
      ordem: 'asc',
    },
  },
  _count: {
    select: {
      redacoes: true,
    },
  },
}

const temaAlunoSelect = {
  id: true,
  enunciado: true,
  descricao: true,
  instrucoes: true,
  prazoEntrega: true,
  ativo: true,
  criadoEm: true,
  atualizadoEm: true,
  turma: {
    select: {
      id: true,
      nome: true,
      professor: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  },
  criterios: {
    select: criterioSelect,
    orderBy: {
      ordem: 'asc',
    },
  },
}

function prepararCriterios(criterios) {
  return criterios.map((criterio, indice) => ({
    nome: criterio.nome,
    descricao: criterio.descricao,
    ordem: indice + 1,
  }))
}

export function buscarTurmaAtivaDoProfessor({
  turmaId,
  professorId,
}) {
  return prisma.turma.findFirst({
    where: {
      id: turmaId,
      professorId,
      ativa: true,
    },
    select: {
      id: true,
    },
  })
}

export function criarTemaComCriterios({
  turmaId,
  enunciado,
  descricao,
  instrucoes,
  prazoEntrega,
  criterios,
}) {
  return prisma.temaRedacao.create({
    data: {
      turmaId,
      enunciado,
      descricao,
      instrucoes: instrucoes ?? null,
      prazoEntrega,
      criterios: {
        create: prepararCriterios(criterios),
      },
    },
    select: temaDetalhadoSelect,
  })
}

export function listarTemasDoProfessor({
  turmaId,
  professorId,
}) {
  return prisma.temaRedacao.findMany({
    where: {
      turmaId,
      turma: {
        professorId,
      },
    },
    select: temaDetalhadoSelect,
    orderBy: [
      {
        ativo: 'desc',
      },
      {
        prazoEntrega: 'asc',
      },
    ],
  })
}

export function buscarTemaDoProfessor({
  temaId,
  professorId,
}) {
  return prisma.temaRedacao.findFirst({
    where: {
      id: temaId,
      turma: {
        professorId,
      },
    },
    select: temaDetalhadoSelect,
  })
}

export async function atualizarTemaDoProfessor({
  temaId,
  professorId,
  dados,
}) {
  const resultado =
    await prisma.temaRedacao.updateMany({
      where: {
        id: temaId,
        ativo: true,
        turma: {
          professorId,
        },
      },
      data: dados,
    })

  if (resultado.count !== 1) {
    return null
  }

  return buscarTemaDoProfessor({
    temaId,
    professorId,
  })
}

export function substituirCriteriosDoTema({
  temaId,
  professorId,
  criterios,
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT id
      FROM temas_redacao
      WHERE id = ${temaId}
      FOR UPDATE
    `

    const tema =
      await transaction.temaRedacao.findFirst({
        where: {
          id: temaId,
          turma: {
            professorId,
          },
        },
        select: {
          id: true,
          ativo: true,
          criteriosBloqueadosEm: true,
        },
      })

    if (!tema) {
      return {
        status: 'TEMA_NAO_ENCONTRADO',
        tema: null,
      }
    }

    if (!tema.ativo) {
      return {
        status: 'TEMA_ARQUIVADO',
        tema: null,
      }
    }

    if (tema.criteriosBloqueadosEm) {
      return {
        status: 'CRITERIOS_BLOQUEADOS',
        tema: null,
      }
    }

    await transaction.criterioAvaliacao.deleteMany({
      where: {
        temaId,
      },
    })

    await transaction.criterioAvaliacao.createMany({
      data: prepararCriterios(criterios).map(
        (criterio) => ({
          ...criterio,
          temaId,
        }),
      ),
    })

    const temaAtualizado =
      await transaction.temaRedacao.findUnique({
        where: {
          id: temaId,
        },
        select: temaDetalhadoSelect,
      })

    return {
      status: 'CRITERIOS_SUBSTITUIDOS',
      tema: temaAtualizado,
    }
  })
}

export async function arquivarTemaDoProfessor({
  temaId,
  professorId,
}) {
  const resultado =
    await prisma.temaRedacao.updateMany({
      where: {
        id: temaId,
        ativo: true,
        turma: {
          professorId,
        },
      },
      data: {
        ativo: false,
        arquivadoEm: new Date(),
      },
    })

  if (resultado.count !== 1) {
    return null
  }

  return buscarTemaDoProfessor({
    temaId,
    professorId,
  })
}

export function buscarTurmaAtivaDoAluno(alunoId) {
  return prisma.matricula.findFirst({
    where: {
      alunoId,
      status: 'ATIVA',
      turma: {
        ativa: true,
      },
    },
    select: {
      turmaId: true,
    },
    orderBy: {
      iniciadaEm: 'desc',
    },
  })
}

export function listarTemasAtivosParaAluno(
  turmaId,
) {
  return prisma.temaRedacao.findMany({
    where: {
      turmaId,
      ativo: true,
      turma: {
        ativa: true,
      },
    },
    select: temaAlunoSelect,
    orderBy: {
      prazoEntrega: 'asc',
    },
  })
}

export function buscarTemaAtivoParaAluno({
  temaId,
  turmaId,
}) {
  return prisma.temaRedacao.findFirst({
    where: {
      id: temaId,
      turmaId,
      ativo: true,
      turma: {
        ativa: true,
      },
    },
    select: temaAlunoSelect,
  })
}