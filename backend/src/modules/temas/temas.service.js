import { AppError } from '../../utils/app-error.js'
import {
  arquivarTemaDoProfessor,
  atualizarTemaDoProfessor,
  buscarTemaAtivoParaAluno,
  buscarTemaDoProfessor,
  buscarTurmaAtivaDoAluno,
  buscarTurmaAtivaDoProfessor,
  criarTemaComCriterios,
  excluirTemaSemHistorico,
  listarTemasAtivosParaAluno,
  listarPrazosDoProfessor,
  listarTemasDoProfessor,
  reabrirTemaDoProfessor,
  substituirCriteriosDoTema,
} from './temas.repository.js'

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000

export function listarPrazosParaProfessor(professorId, agora = new Date()) {
  return listarPrazosDoProfessor({
    professorId,
    inicio: agora,
    fim: new Date(agora.getTime() + SETE_DIAS_MS),
  })
}

function criarErroTurmaInvalida() {
  return new AppError(
    'A turma não foi encontrada ou está arquivada.',
    {
      statusCode: 404,
      code: 'CLASS_NOT_FOUND',
    },
  )
}

function criarErroTemaNaoEncontrado() {
  return new AppError(
    'O tema de redação não foi encontrado.',
    {
      statusCode: 404,
      code: 'ESSAY_TOPIC_NOT_FOUND',
    },
  )
}

export async function excluirTemaParaProfessor({ temaId, professorId }) {
  const resultado = await excluirTemaSemHistorico({ temaId, professorId })
  if (resultado === 'NAO_ENCONTRADO') throw criarErroTemaNaoEncontrado()
  if (resultado === 'ATIVO') {
    throw new AppError('Arquive a proposta antes de excluí-la definitivamente.', {
      statusCode: 409, code: 'ESSAY_TOPIC_NOT_ARCHIVED',
    })
  }
  if (resultado === 'COM_HISTORICO') {
    throw new AppError('Esta proposta possui rascunhos ou redações no histórico. Use o arquivamento.', {
      statusCode: 409, code: 'ESSAY_TOPIC_HAS_HISTORY',
    })
  }
}

function criarErroTemaArquivado() {
  return new AppError(
    'O tema de redação está arquivado.',
    {
      statusCode: 409,
      code: 'ESSAY_TOPIC_ARCHIVED',
    },
  )
}

function criarErroPrazoInvalido() {
  return new AppError(
    'O prazo de entrega deve estar no futuro.',
    {
      statusCode: 422,
      code: 'DEADLINE_MUST_BE_IN_FUTURE',
    },
  )
}

function criarErroConteudoBloqueado() {
  return new AppError(
    'O conteúdo do tema não pode ser alterado após o recebimento da primeira redação.',
    {
      statusCode: 409,
      code: 'ESSAY_TOPIC_CONTENT_LOCKED',
    },
  )
}

function criarErroCriteriosBloqueados() {
  return new AppError(
    'Os critérios não podem ser alterados após o recebimento da primeira redação.',
    {
      statusCode: 409,
      code: 'EVALUATION_CRITERIA_LOCKED',
    },
  )
}

function criarErroMatriculaAtivaNaoEncontrada() {
  return new AppError(
    'Você precisa estar matriculado em uma turma ativa para acessar os temas.',
    {
      statusCode: 404,
      code: 'ACTIVE_ENROLLMENT_NOT_FOUND',
    },
  )
}

function prazoEstaNoFuturo(prazoEntrega) {
  return prazoEntrega.getTime() > Date.now()
}

function prepararTemaParaResposta(tema) {
  const {
    _count,
    ...dadosTema
  } = tema

  return {
    ...dadosTema,
    criteriosBloqueados:
      Boolean(tema.criteriosBloqueadosEm),
    quantidadeRedacoes: _count.redacoes,
  }
}

async function buscarTemaObrigatorio({
  temaId,
  professorId,
}) {
  const tema = await buscarTemaDoProfessor({
    temaId,
    professorId,
  })

  if (!tema) {
    throw criarErroTemaNaoEncontrado()
  }

  return tema
}

async function buscarTemaAtivoObrigatorio({
  temaId,
  professorId,
}) {
  const tema = await buscarTemaObrigatorio({
    temaId,
    professorId,
  })

  if (!tema.ativo) {
    throw criarErroTemaArquivado()
  }

  return tema
}

export async function criarTemaParaProfessor({
  turmaId,
  professorId,
  enunciado,
  descricao,
  instrucoes,
  prazoEntrega,
  criterios,
}) {
  if (!prazoEstaNoFuturo(prazoEntrega)) {
    throw criarErroPrazoInvalido()
  }

  const turma = await buscarTurmaAtivaDoProfessor({
    turmaId,
    professorId,
  })

  if (!turma) {
    throw criarErroTurmaInvalida()
  }

  try {
    const tema = await criarTemaComCriterios({
      turmaId,
      enunciado,
      descricao,
      instrucoes,
      prazoEntrega,
      criterios,
    })
    return prepararTemaParaResposta(tema)
  } catch (error) {
    // A turma pode ter sido excluída depois da verificação inicial.
    if (error.code === 'P2003' && !await buscarTurmaAtivaDoProfessor({ turmaId, professorId })) {
      throw criarErroTurmaInvalida()
    }
    throw error
  }
}

export async function listarTemasParaProfessor({
  turmaId,
  professorId,
}) {
  const temas = await listarTemasDoProfessor({
    turmaId,
    professorId,
  })

  return temas.map(prepararTemaParaResposta)
}

export async function obterTemaParaProfessor({
  temaId,
  professorId,
}) {
  const tema = await buscarTemaObrigatorio({
    temaId,
    professorId,
  })

  return prepararTemaParaResposta(tema)
}

export async function atualizarTemaParaProfessor({
  temaId,
  professorId,
  dados,
}) {
  const tema = await buscarTemaAtivoObrigatorio({
    temaId,
    professorId,
  })

  if (
    dados.prazoEntrega &&
    !prazoEstaNoFuturo(dados.prazoEntrega)
  ) {
    throw criarErroPrazoInvalido()
  }

  const alteraConteudo = Object.keys(dados).some(
    (campo) => campo !== 'prazoEntrega',
  )

  if (
    tema.criteriosBloqueadosEm &&
    alteraConteudo
  ) {
    throw criarErroConteudoBloqueado()
  }

  const temaAtualizado =
    await atualizarTemaDoProfessor({
      temaId,
      professorId,
      dados,
    })

  if (temaAtualizado === 'CONTEUDO_BLOQUEADO') {
    throw criarErroConteudoBloqueado()
  }

  if (!temaAtualizado) {
    throw criarErroTemaArquivado()
  }

  return prepararTemaParaResposta(temaAtualizado)
}

export async function substituirCriteriosParaProfessor({
  temaId,
  professorId,
  criterios,
}) {
  const tema = await buscarTemaAtivoObrigatorio({
    temaId,
    professorId,
  })

  if (tema.criteriosBloqueadosEm) {
    throw criarErroCriteriosBloqueados()
  }

  const resultado = await substituirCriteriosDoTema({
    temaId,
    professorId,
    criterios,
  })

  if (resultado.status === 'TEMA_NAO_ENCONTRADO') {
    throw criarErroTemaNaoEncontrado()
  }

  if (resultado.status === 'TEMA_ARQUIVADO') {
    throw criarErroTemaArquivado()
  }

  if (resultado.status === 'CRITERIOS_BLOQUEADOS') {
    throw criarErroCriteriosBloqueados()
  }

  return prepararTemaParaResposta(resultado.tema)
}

export async function arquivarTemaParaProfessor({
  temaId,
  professorId,
}) {
  await buscarTemaAtivoObrigatorio({
    temaId,
    professorId,
  })

  const tema = await arquivarTemaDoProfessor({
    temaId,
    professorId,
  })

  if (!tema) {
    throw criarErroTemaArquivado()
  }

  return prepararTemaParaResposta(tema)
}

export async function reabrirTemaParaProfessor({ temaId, professorId }) {
  const existente = await buscarTemaObrigatorio({ temaId, professorId })
  const resultado = await reabrirTemaDoProfessor({
    temaId,
    turmaId: existente.turmaId,
    professorId,
  })

  if (resultado.status === 'TEMA_NAO_ENCONTRADO') throw criarErroTemaNaoEncontrado()
  if (resultado.status === 'TURMA_ARQUIVADA') {
    throw new AppError('Reabra a turma antes de reabrir a proposta.', {
      statusCode: 409,
      code: 'CLASS_ARCHIVED',
    })
  }
  if (resultado.status === 'TEMA_JA_ATIVO') {
    throw new AppError('Esta proposta já está ativa.', {
      statusCode: 409,
      code: 'ESSAY_TOPIC_ALREADY_ACTIVE',
    })
  }

  return prepararTemaParaResposta(resultado.tema)
}

export async function listarTemasParaAluno(
  alunoId,
) {
  const matricula =
    await buscarTurmaAtivaDoAluno(alunoId)

  if (!matricula) {
    throw criarErroMatriculaAtivaNaoEncontrada()
  }

  return listarTemasAtivosParaAluno(
    matricula.turmaId,
  )
}

export async function obterTemaParaAluno({
  temaId,
  alunoId,
}) {
  const matricula =
    await buscarTurmaAtivaDoAluno(alunoId)

  if (!matricula) {
    throw criarErroMatriculaAtivaNaoEncontrada()
  }

  const tema = await buscarTemaAtivoParaAluno({
    temaId,
    turmaId: matricula.turmaId,
  })

  if (!tema) {
    throw criarErroTemaNaoEncontrado()
  }

  return tema
}

