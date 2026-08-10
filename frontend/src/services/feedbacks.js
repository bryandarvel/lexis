import api from './api.js'

function prepararId(id) {
  return encodeURIComponent(id)
}

export async function obterFeedbackProfessor(
  redacaoId,
) {
  const resposta = await api.get(
    `/api/redacoes/${prepararId(
      redacaoId,
    )}/feedback`,
  )

  return resposta.data.data.feedback
}

export async function obterFeedbackAluno(
  redacaoId,
) {
  const resposta = await api.get(
    `/api/aluno/redacoes/${prepararId(
      redacaoId,
    )}/feedback`,
  )

  return resposta.data.data.feedback
}

export async function salvarRascunhoFeedback(
  redacaoId,
  dados,
) {
  const resposta = await api.put(
    `/api/redacoes/${prepararId(
      redacaoId,
    )}/feedback`,
    dados,
  )

  return resposta.data.data.feedback
}

export async function publicarFeedback(
  redacaoId,
) {
  const resposta = await api.post(
    `/api/redacoes/${prepararId(
      redacaoId,
    )}/feedback/publicar`,
  )

  return resposta.data.data
}
