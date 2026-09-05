import { AppError } from '../../utils/app-error.js'

import {
  consultarFeedback,
  consultarFeedbackPublicadoAluno,
  publicarFeedback,
  salvarFeedbackRascunho,
} from './feedbacks.repository.js'

function criarErroRedacaoNaoEncontrada() {
  return new AppError(
    'A redação não foi encontrada ou não está disponível para correção.',
    {
      statusCode: 404,
      code: 'ESSAY_NOT_FOUND',
    },
  )
}

function criarErroCriteriosInvalidos() {
  return new AppError(
    'Um ou mais critérios não pertencem ao tema da redação.',
    {
      statusCode: 422,
      code: 'FEEDBACK_CRITERIA_INVALID',
    },
  )
}

function criarErroRascunhoAusente() {
  return new AppError(
    'É necessário salvar um rascunho antes de publicar a correção.',
    {
      statusCode: 409,
      code: 'FEEDBACK_DRAFT_REQUIRED',
    },
  )
}

function criarErroRascunhoIncompleto(camposPendentes) {
  return new AppError(
    'Preencha as cinco competências e o comentário geral antes de publicar a correção.',
    {
      statusCode: 422,
      code: 'FEEDBACK_INCOMPLETE',
      details: {
        camposPendentes,
      },
    },
  )
}

function criarErroRedacaoAlunoNaoEncontrada() {
  return new AppError(
    'A redação não foi encontrada.',
    {
      statusCode: 404,
      code: 'ESSAY_NOT_FOUND',
    },
  )
}

function criarErroFeedbackIndisponivel() {
  return new AppError(
    'A correção desta redação ainda não está disponível.',
    {
      statusCode: 404,
      code: 'FEEDBACK_NOT_AVAILABLE',
    },
  )
}

export async function salvarFeedbackRascunhoParaProfessor(
  dados,
  {
    salvar = salvarFeedbackRascunho,
  } = {},
) {
  const resultado = await salvar(dados)

  if (resultado.status === 'REDACAO_INDISPONIVEL') {
    throw criarErroRedacaoNaoEncontrada()
  }

  if (resultado.status === 'CRITERIOS_INVALIDOS') {
    throw criarErroCriteriosInvalidos()
  }

  return resultado.feedbackVersao
}

export async function consultarFeedbackParaProfessor(
  dados,
  {
    consultar = consultarFeedback,
  } = {},
) {
  const resultado = await consultar(dados)

  if (resultado.status === 'REDACAO_INDISPONIVEL') {
    throw criarErroRedacaoNaoEncontrada()
  }

  if (!resultado.feedback) {
    return null
  }

  const {
    versoes,
    ...feedback
  } = resultado.feedback

  return {
    ...feedback,
    versaoAtual: versoes[0] ?? null,
    historico: versoes,
  }
}

export async function publicarFeedbackParaProfessor(
  {
    redacaoId,
    professorId,
  },
  {
    publicar = publicarFeedback,
    agora = () => new Date(),
  } = {},
) {
  const resultado = await publicar({
    redacaoId,
    professorId,
    publicadoEm: agora(),
  })

  if (resultado.status === 'REDACAO_INDISPONIVEL') {
    throw criarErroRedacaoNaoEncontrada()
  }

  if (resultado.status === 'RASCUNHO_AUSENTE') {
    throw criarErroRascunhoAusente()
  }

  if (resultado.status === 'RASCUNHO_INCOMPLETO') {
    throw criarErroRascunhoIncompleto(
      resultado.camposPendentes,
    )
  }

  return {
    feedback: resultado.feedbackVersao,
    notificacao: resultado.notificacao,
  }
}

export async function consultarFeedbackPublicadoParaAluno(
  dados,
  {
    consultar = consultarFeedbackPublicadoAluno,
  } = {},
) {
  const resultado = await consultar(dados)

  if (resultado.status === 'REDACAO_INDISPONIVEL') {
    throw criarErroRedacaoAlunoNaoEncontrada()
  }

  if (resultado.status === 'FEEDBACK_INDISPONIVEL') {
    throw criarErroFeedbackIndisponivel()
  }

  return resultado.feedbackVersao
}
