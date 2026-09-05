import api from './api.js'

function prepararId(id) {
  return encodeURIComponent(id)
}

export async function criarTema(
  turmaId,
  dados,
) {
  const resposta = await api.post(
    `/api/turmas/${prepararId(turmaId)}/temas`,
    dados,
  )

  return resposta.data.data.tema
}

export async function listarTemasDaTurma(
  turmaId,
) {
  const resposta = await api.get(
    `/api/turmas/${prepararId(turmaId)}/temas`,
  )

  return resposta.data.data.temas
}

export async function obterTemaProfessor(
  temaId,
) {
  const resposta = await api.get(
    `/api/temas/${prepararId(temaId)}`,
  )

  return resposta.data.data.tema
}

export async function atualizarTema(
  temaId,
  dados,
) {
  const resposta = await api.patch(
    `/api/temas/${prepararId(temaId)}`,
    dados,
  )

  return resposta.data.data.tema
}

export async function substituirCriterios(
  temaId,
  criterios,
) {
  const resposta = await api.put(
    `/api/temas/${prepararId(
      temaId,
    )}/criterios`,
    {
      criterios,
    },
  )

  return resposta.data.data.tema
}

export async function arquivarTema(temaId) {
  const resposta = await api.post(
    `/api/temas/${prepararId(temaId)}/arquivar`,
  )

  return resposta.data.data.tema
}

export async function listarTemasDoAluno() {
  const resposta = await api.get(
    '/api/aluno/temas',
  )

  return resposta.data.data.temas
}

export async function obterTemaDoAluno(
  temaId,
) {
  const resposta = await api.get(
    `/api/aluno/temas/${prepararId(temaId)}`,
  )

  return resposta.data.data.tema
}

export async function obterModeloCompetenciaDois() {
  const resposta = await api.get(
    '/api/modelos-avaliacao/competencia-2',
  )

  return resposta.data.data.modelo
}
