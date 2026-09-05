import api from './api.js'

export async function listarNotificacoes({ signal } = {}) {
  const resposta = await api.get(
    '/api/aluno/notificacoes',
    { signal },
  )

  return resposta.data.data
}

export async function marcarNotificacaoLida(notificacaoId) {
  const resposta = await api.patch(
    `/api/aluno/notificacoes/${encodeURIComponent(notificacaoId)}/lida`,
  )

  return resposta.data.data.notificacao
}
