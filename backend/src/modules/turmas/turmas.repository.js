import { prisma } from '../../config/prisma.js'

const turmaProfessorSelect = {
  id: true,
  nome: true,
  codigoAcesso: true,
  codigoAtualizadoEm: true,
  ativa: true,
  arquivadaEm: true,
  criadoEm: true,
  atualizadoEm: true,
  professor: {
    select: {
      id: true,
      nome: true,
      email: true,
    },
  },
  _count: {
    select: {
      matriculas: {
        where: {
          status: 'ATIVA',
        },
      },
      temas: {
        where: {
          ativo: true,
        },
      },
    },
  },
}

export function criarTurma({
  nome,
  codigoAcesso,
  professorId,
}) {
  return prisma.turma.create({
    data: {
      nome,
      codigoAcesso,
      professorId,
    },
    select: turmaProfessorSelect,
  })
}

export function listarTurmasDoProfessor(professorId) {
  return prisma.turma.findMany({
    where: {
      professorId,
    },
    select: turmaProfessorSelect,
    orderBy: [
      {
        ativa: 'desc',
      },
      {
        criadoEm: 'desc',
      },
    ],
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
    select: turmaProfessorSelect,
  })
}

export async function atualizarNomeDaTurma({
  turmaId,
  professorId,
  nome,
}) {
  const resultado = await prisma.turma.updateMany({
    where: {
      id: turmaId,
      professorId,
      ativa: true,
    },
    data: {
      nome,
    },
  })

  if (resultado.count !== 1) {
    return null
  }

  return buscarTurmaDoProfessor({
    turmaId,
    professorId,
  })
}

export async function atualizarCodigoDaTurma({
  turmaId,
  professorId,
  codigoAcesso,
}) {
  const resultado = await prisma.turma.updateMany({
    where: {
      id: turmaId,
      professorId,
      ativa: true,
    },
    data: {
      codigoAcesso,
      codigoAtualizadoEm: new Date(),
    },
  })

  if (resultado.count !== 1) {
    return null
  }

  return buscarTurmaDoProfessor({
    turmaId,
    professorId,
  })
}

export function arquivarTurma({
  turmaId,
  professorId,
}) {
  return prisma.$transaction(async (transaction) => {
    const agora = new Date()

    const resultado = await transaction.turma.updateMany({
      where: {
        id: turmaId,
        professorId,
        ativa: true,
      },
      data: {
        ativa: false,
        arquivadaEm: agora,
      },
    })

    if (resultado.count !== 1) {
      return null
    }

    await transaction.matricula.updateMany({
      where: {
        turmaId,
        status: 'ATIVA',
      },
      data: {
        status: 'ENCERRADA',
        encerradaEm: agora,
      },
    })

    return transaction.turma.findUnique({
      where: {
        id: turmaId,
      },
      select: turmaProfessorSelect,
    })
  })
}
const matriculaAlunoSelect = {
  id: true,
  status: true,
  iniciadaEm: true,
  encerradaEm: true,
  turma: {
    select: {
      id: true,
      nome: true,
      ativa: true,
      professor: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  },
}

const matriculaProfessorSelect = {
  id: true,
  status: true,
  iniciadaEm: true,
  encerradaEm: true,
  aluno: {
    select: {
      id: true,
      nome: true,
      email: true,
      ativo: true,
    },
  },
}

export function buscarTurmaAtivaPorCodigo(
  codigoAcesso,
) {
  return prisma.turma.findFirst({
    where: {
      codigoAcesso,
      ativa: true,
    },
    select: {
      id: true,
    },
  })
}

export function buscarMatriculaAtivaDoAluno(
  alunoId,
) {
  return prisma.matricula.findFirst({
    where: {
      alunoId,
      status: 'ATIVA',
    },
    select: matriculaAlunoSelect,
    orderBy: {
      iniciadaEm: 'desc',
    },
  })
}

export function criarMatriculaAtivaComExclusividade({
  alunoId,
  turmaId,
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT id
      FROM usuarios
      WHERE id = ${alunoId}
      FOR UPDATE
    `

    const turmaAtiva =
      await transaction.turma.findFirst({
        where: {
          id: turmaId,
          ativa: true,
        },
        select: {
          id: true,
        },
      })

    if (!turmaAtiva) {
      return {
        status: 'TURMA_INDISPONIVEL',
        matricula: null,
      }
    }

    const matriculaExistente =
      await transaction.matricula.findFirst({
        where: {
          alunoId,
          status: 'ATIVA',
        },
        select: matriculaAlunoSelect,
        orderBy: {
          iniciadaEm: 'desc',
        },
      })

    if (matriculaExistente) {
      return {
        status: 'MATRICULA_ATIVA_EXISTENTE',
        matricula: matriculaExistente,
      }
    }

    const matricula =
      await transaction.matricula.create({
        data: {
          alunoId,
          turmaId,
        },
        select: matriculaAlunoSelect,
      })

    return {
      status: 'MATRICULA_CRIADA',
      matricula,
    }
  })
}

export function encerrarMatriculaAtivaDoAluno(
  alunoId,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT id
      FROM usuarios
      WHERE id = ${alunoId}
      FOR UPDATE
    `

    const matricula =
      await transaction.matricula.findFirst({
        where: {
          alunoId,
          status: 'ATIVA',
        },
        select: {
          id: true,
        },
        orderBy: {
          iniciadaEm: 'desc',
        },
      })

    if (!matricula) {
      return null
    }

    return transaction.matricula.update({
      where: {
        id: matricula.id,
      },
      data: {
        status: 'ENCERRADA',
        encerradaEm: new Date(),
      },
      select: matriculaAlunoSelect,
    })
  })
}

export function listarMatriculasAtivasDaTurma({
  turmaId,
  professorId,
}) {
  return prisma.matricula.findMany({
    where: {
      turmaId,
      status: 'ATIVA',
      turma: {
        professorId,
      },
    },
    select: matriculaProfessorSelect,
    orderBy: {
      aluno: {
        nome: 'asc',
      },
    },
  })
}

export function encerrarMatriculaPeloProfessor({
  turmaId,
  alunoId,
  professorId,
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT id
      FROM usuarios
      WHERE id = ${alunoId}
      FOR UPDATE
    `

    const turma =
      await transaction.turma.findFirst({
        where: {
          id: turmaId,
          professorId,
          ativa: true,
        },
        select: {
          id: true,
        },
      })

    if (!turma) {
      return {
        status: 'TURMA_INDISPONIVEL',
        matricula: null,
      }
    }

    const matricula =
      await transaction.matricula.findFirst({
        where: {
          turmaId,
          alunoId,
          status: 'ATIVA',
        },
        select: {
          id: true,
        },
      })

    if (!matricula) {
      return {
        status: 'MATRICULA_NAO_ENCONTRADA',
        matricula: null,
      }
    }

    const matriculaEncerrada =
      await transaction.matricula.update({
        where: {
          id: matricula.id,
        },
        data: {
          status: 'ENCERRADA',
          encerradaEm: new Date(),
        },
        select: matriculaProfessorSelect,
      })

    return {
      status: 'MATRICULA_ENCERRADA',
      matricula: matriculaEncerrada,
    }
  })
}