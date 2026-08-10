import { AppError } from '../../utils/app-error.js'

import {
  arquivarTurma as arquivarTurmaRepository,
  atualizarCodigoDaTurma,
  atualizarNomeDaTurma,
  buscarMatriculaAtivaDoAluno,
  buscarTurmaAtivaPorCodigo,
  buscarTurmaDoProfessor,
  criarMatriculaAtivaComExclusividade,
  criarTurma,
  encerrarMatriculaAtivaDoAluno,
  encerrarMatriculaPeloProfessor,
  listarMatriculasAtivasDaTurma,
  listarTurmasDoProfessor,
} from './turmas.repository.js'

import {
  gerarCodigoAcessoTurma,
} from './turma-code.service.js'

const MAXIMO_TENTATIVAS_CODIGO = 5

function criarErroTurmaNaoEncontrada() {
  return new AppError('Turma não encontrada.', {
    statusCode: 404,
    code: 'CLASS_NOT_FOUND',
  })
}

function criarErroTurmaArquivada() {
  return new AppError(
    'Esta turma está arquivada e não pode ser alterada.',
    {
      statusCode: 409,
      code: 'CLASS_ARCHIVED',
    },
  )
}

function criarErroGeracaoCodigo() {
  return new AppError(
    'Não foi possível gerar um código de acesso para a turma.',
    {
      statusCode: 503,
      code: 'ACCESS_CODE_GENERATION_FAILED',
    },
  )
}

function criarErroCodigoTurmaInvalido() {
  return new AppError(
    'O código informado não corresponde a uma turma ativa.',
    {
      statusCode: 404,
      code: 'CLASS_ACCESS_CODE_INVALID',
    },
  )
}

function criarErroMatriculaNaMesmaTurma() {
  return new AppError(
    'Você já está matriculado nesta turma.',
    {
      statusCode: 409,
      code: 'ALREADY_ENROLLED_IN_CLASS',
    },
  )
}

function criarErroOutraMatriculaAtiva() {
  return new AppError(
    'Você precisa se desvincular da turma atual antes de entrar em outra.',
    {
      statusCode: 409,
      code: 'ACTIVE_ENROLLMENT_EXISTS',
    },
  )
}

function criarErroMatriculaNaoEncontrada() {
  return new AppError(
    'Você não possui uma matrícula ativa.',
    {
      statusCode: 404,
      code: 'ACTIVE_ENROLLMENT_NOT_FOUND',
    },
  )
}

function criarErroAlunoNaoMatriculadoNaTurma() {
  return new AppError(
    'O aluno não possui matrícula ativa nesta turma.',
    {
      statusCode: 404,
      code: 'ENROLLMENT_NOT_FOUND',
    },
  )
}

function prepararTurmaParaResposta(turma) {
  const {
    _count,
    ...dadosTurma
  } = turma

  return {
    ...dadosTurma,
    quantidadeAlunosAtivos: _count.matriculas,
    quantidadeTemasAtivos: _count.temas,
  }
}

function codigoDuplicado(error) {
  return error?.code === 'P2002'
}

async function buscarTurmaObrigatoria({
  turmaId,
  professorId,
}) {
  const turma = await buscarTurmaDoProfessor({
    turmaId,
    professorId,
  })

  if (!turma) {
    throw criarErroTurmaNaoEncontrada()
  }

  return turma
}

async function buscarTurmaAtivaObrigatoria({
  turmaId,
  professorId,
}) {
  const turma = await buscarTurmaObrigatoria({
    turmaId,
    professorId,
  })

  if (!turma.ativa) {
    throw criarErroTurmaArquivada()
  }

  return turma
}

export async function criarTurmaParaProfessor({
  nome,
  professorId,
}) {
  for (
    let tentativa = 1;
    tentativa <= MAXIMO_TENTATIVAS_CODIGO;
    tentativa += 1
  ) {
    const codigoAcesso = gerarCodigoAcessoTurma()

    try {
      const turma = await criarTurma({
        nome,
        codigoAcesso,
        professorId,
      })

      return prepararTurmaParaResposta(turma)
    } catch (error) {
      if (!codigoDuplicado(error)) {
        throw error
      }
    }
  }

  throw criarErroGeracaoCodigo()
}

export async function listarTurmasParaProfessor(
  professorId,
) {
  const turmas = await listarTurmasDoProfessor(
    professorId,
  )

  return turmas.map(prepararTurmaParaResposta)
}

export async function obterTurmaParaProfessor({
  turmaId,
  professorId,
}) {
  const turma = await buscarTurmaObrigatoria({
    turmaId,
    professorId,
  })

  return prepararTurmaParaResposta(turma)
}

export async function renomearTurmaParaProfessor({
  turmaId,
  professorId,
  nome,
}) {
  await buscarTurmaAtivaObrigatoria({
    turmaId,
    professorId,
  })

  const turmaAtualizada = await atualizarNomeDaTurma({
    turmaId,
    professorId,
    nome,
  })

  if (!turmaAtualizada) {
    throw criarErroTurmaArquivada()
  }

  return prepararTurmaParaResposta(turmaAtualizada)
}

export async function regenerarCodigoParaProfessor({
  turmaId,
  professorId,
}) {
  await buscarTurmaAtivaObrigatoria({
    turmaId,
    professorId,
  })

  for (
    let tentativa = 1;
    tentativa <= MAXIMO_TENTATIVAS_CODIGO;
    tentativa += 1
  ) {
    const codigoAcesso = gerarCodigoAcessoTurma()

    try {
      const turmaAtualizada =
        await atualizarCodigoDaTurma({
          turmaId,
          professorId,
          codigoAcesso,
        })

      if (!turmaAtualizada) {
        throw criarErroTurmaArquivada()
      }

      return prepararTurmaParaResposta(
        turmaAtualizada,
      )
    } catch (error) {
      if (!codigoDuplicado(error)) {
        throw error
      }
    }
  }

  throw criarErroGeracaoCodigo()
}

export async function arquivarTurmaParaProfessor({
  turmaId,
  professorId,
}) {
  await buscarTurmaAtivaObrigatoria({
    turmaId,
    professorId,
  })

  const turmaArquivada =
    await arquivarTurmaRepository({
      turmaId,
      professorId,
    })

  if (!turmaArquivada) {
    throw criarErroTurmaArquivada()
  }

  return prepararTurmaParaResposta(turmaArquivada)
}

export async function entrarEmTurmaComoAluno({
  alunoId,
  codigoAcesso,
}) {
  const turma = await buscarTurmaAtivaPorCodigo(
    codigoAcesso,
  )

  if (!turma) {
    throw criarErroCodigoTurmaInvalido()
  }

  const resultado =
    await criarMatriculaAtivaComExclusividade({
      alunoId,
      turmaId: turma.id,
    })

  if (resultado.status === 'TURMA_INDISPONIVEL') {
    throw criarErroCodigoTurmaInvalido()
  }

  if (
    resultado.status ===
    'MATRICULA_ATIVA_EXISTENTE'
  ) {
    const mesmaTurma =
      resultado.matricula.turma.id === turma.id

    if (mesmaTurma) {
      throw criarErroMatriculaNaMesmaTurma()
    }

    throw criarErroOutraMatriculaAtiva()
  }

  return resultado.matricula
}

export async function obterMatriculaAtivaParaAluno(
  alunoId,
) {
  const matricula =
    await buscarMatriculaAtivaDoAluno(alunoId)

  if (!matricula) {
    throw criarErroMatriculaNaoEncontrada()
  }

  return matricula
}

export async function sairDaTurmaComoAluno(alunoId) {
  const matricula =
    await encerrarMatriculaAtivaDoAluno(alunoId)

  if (!matricula) {
    throw criarErroMatriculaNaoEncontrada()
  }

  return matricula
}

export async function listarAlunosAtivosParaProfessor({
  turmaId,
  professorId,
}) {
  await buscarTurmaAtivaObrigatoria({
    turmaId,
    professorId,
  })

  return listarMatriculasAtivasDaTurma({
    turmaId,
    professorId,
  })
}

export async function desvincularAlunoComoProfessor({
  turmaId,
  alunoId,
  professorId,
}) {
  await buscarTurmaAtivaObrigatoria({
    turmaId,
    professorId,
  })

  const resultado =
    await encerrarMatriculaPeloProfessor({
      turmaId,
      alunoId,
      professorId,
    })

  if (resultado.status === 'TURMA_INDISPONIVEL') {
    throw criarErroTurmaArquivada()
  }

  if (
    resultado.status ===
    'MATRICULA_NAO_ENCONTRADA'
  ) {
    throw criarErroAlunoNaoMatriculadoNaTurma()
  }

  return resultado.matricula
}