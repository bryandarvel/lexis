import api from './api.js'

// Irmão de services/notificacoes.js, que atende só o aluno. O backend mantém
// os dois caminhos separados de propósito (#72), e não há paginação.
export async function listarNotificacoesProfessor({ signal } = {}) {
  const resposta = await api.get(
    '/api/professor/notificacoes',
    { signal },
  )

  return resposta.data.data
}

export async function marcarNotificacaoProfessorLida(notificacaoId) {
  const resposta = await api.patch(
    `/api/professor/notificacoes/${encodeURIComponent(notificacaoId)}/lida`,
  )

  return resposta.data.data.notificacao
}
