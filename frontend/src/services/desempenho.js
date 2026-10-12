import api from './api.js'

export async function obterDesempenhoAluno() {
  const resposta = await api.get(
    '/api/aluno/desempenho',
  )

  return resposta.data.data.desempenho
}
