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

function dadosAvisoEncerramento({ alunoId, nomeTurma, arquivada = false }) {
  return {
    usuarioId: alunoId,
    tipo: arquivada ? 'TURMA_ARQUIVADA' : 'MATRICULA_ENCERRADA',
    titulo: arquivada ? 'Turma arquivada' : 'Vínculo com a turma encerrado',
    mensagem: `${arquivada ? 'A turma' : 'Você foi desvinculado da turma'} "${nomeTurma}"${arquivada ? ' foi arquivada' : ''}. Suas redações e correções publicadas continuam disponíveis no histórico.`,
    feedbackVersaoId: null, redacaoId: null, emailDestino: null, statusEmail: null,
  }
}

export async function arquivarTurma({
  turmaId,
  professorId,
}) {
  const permitida = await prisma.turma.findFirst({
    where: { id: turmaId, professorId, ativa: true }, select: { id: true },
  })
  if (!permitida) return null

  // A FK da notificação também bloqueia usuário. Não segurar turma antes deles:
  // uma entrada concorrente já pode segurar usuário enquanto aguarda a turma.
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const previa = await prisma.matricula.findMany({
      where: { turmaId, status: 'ATIVA' }, select: { alunoId: true }, distinct: ['alunoId'],
    })
    const alunosBloqueados = new Set(previa.map(m => m.alunoId))
    const resultado = await prisma.$transaction(async transaction => {
      for (const alunoId of [...alunosBloqueados].sort()) {
        await transaction.$queryRaw`SELECT id FROM usuarios WHERE id = ${alunoId} FOR UPDATE`
      }
      await transaction.$queryRaw`SELECT id FROM turmas WHERE id = ${turmaId} FOR UPDATE`
      const turma = await transaction.turma.findFirst({
        where: { id: turmaId, professorId, ativa: true }, select: { nome: true },
      })
      if (!turma) return null
      const atuais = await transaction.matricula.findMany({
        where: { turmaId, status: 'ATIVA' }, select: { alunoId: true }, distinct: ['alunoId'],
      })
      // Nenhuma escrita ocorreu: expandir o conjunto fora dos locks atuais.
      if (atuais.some(m => !alunosBloqueados.has(m.alunoId))) return 'MATRICULAS_ALTERADAS'

      const agora = new Date()
      await transaction.turma.updateMany({
        where: { id: turmaId, professorId, ativa: true }, data: { ativa: false, arquivadaEm: agora },
      })
      await transaction.matricula.updateMany({
        where: { turmaId, status: 'ATIVA' }, data: { status: 'ENCERRADA', encerradaEm: agora },
      })
      if (atuais.length) await transaction.notificacao.createMany({
        data: atuais.map(m => dadosAvisoEncerramento({ alunoId: m.alunoId, nomeTurma: turma.nome, arquivada: true })),
      })
      return transaction.turma.findUnique({ where: { id: turmaId }, select: turmaProfessorSelect })
    })
    if (resultado !== 'MATRICULAS_ALTERADAS') return resultado
  }
  // Crescimento contínuo: nenhuma tentativa fez alterações ou criou avisos.
  return 'MATRICULAS_ALTERADAS'
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

    // Ordem: usuário -> turma -> matrícula. Arquivamento bloqueia primeiro
    // usuários em ordem crescente, depois turma/matrículas/avisos.
    // Nenhum encerramento pode adquirir usuário depois de segurar a turma.
    // A leitura abaixo só pode ocorrer depois de um arquivamento concorrente
    // terminar, ou a entrada termina antes e será encerrada por ele.
    await transaction.$queryRaw`
      SELECT id
      FROM turmas
      WHERE id = ${turmaId}
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
  matriculaId,
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

    if (matricula.id !== matriculaId) {
      return 'MATRICULA_ALTERADA'
    }

    // A condição também protege contra encerramento por arquivamento
    // ou desvinculação depois da leitura, sem reativar nem alterar o histórico.
    const resultado = await transaction.matricula.updateMany({
      where: {
        id: matriculaId,
        alunoId,
        status: 'ATIVA',
      },
      data: {
        status: 'ENCERRADA',
        encerradaEm: new Date(),
      },
    })

    if (resultado.count !== 1) return null

    const matriculaEncerrada = await transaction.matricula.findUnique({
      where: { id: matriculaId },
      select: matriculaAlunoSelect,
    })
    const aluno = await transaction.usuario.findUnique({
      where: { id: alunoId }, select: { nome: true },
    })
    await transaction.notificacao.create({
      data: {
        usuarioId: matriculaEncerrada.turma.professor.id,
        tipo: 'ALUNO_SAIU_TURMA',
        titulo: 'Aluno saiu da turma',
        mensagem: `${aluno.nome} saiu voluntariamente da turma "${matriculaEncerrada.turma.nome}". As redações enviadas e correções continuam no histórico.`,
        feedbackVersaoId: null, redacaoId: null, emailDestino: null, statusEmail: null,
      },
    })
    return matriculaEncerrada
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

    await transaction.$queryRaw`SELECT id FROM turmas WHERE id = ${turmaId} FOR UPDATE`

    const turma =
      await transaction.turma.findFirst({
        where: {
          id: turmaId,
          professorId,
          ativa: true,
        },
        select: {
          id: true,
          nome: true,
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

    await transaction.notificacao.create({
      data: dadosAvisoEncerramento({ alunoId, nomeTurma: turma.nome }),
    })

    return {
      status: 'MATRICULA_ENCERRADA',
      matricula: matriculaEncerrada,
    }
  })
}
