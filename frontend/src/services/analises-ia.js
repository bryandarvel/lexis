import api from './api.js'

function prepararId(id) {
  return encodeURIComponent(id)
}

export async function listarAnalisesIa(
  redacaoId,
) {
  const resposta = await api.get(
    `/api/redacoes/${prepararId(
      redacaoId,
    )}/analises-ia`,
  )

  return resposta.data.data.analises
}

export async function solicitarAnaliseIa(
  redacaoId,
) {
  const resposta = await api.post(
    `/api/redacoes/${prepararId(
      redacaoId,
    )}/analises-ia`,
  )

  return resposta.data.data.analise
}
