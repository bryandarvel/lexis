import api, { apiPublica } from './api.js'

// Operações confirmadas com senha não são repetidas com uma sessão renovada.
const semReenvio = { naoReenviarAposRenovacao: true }

// Vale para ALUNO e PROFESSOR; o identificado é sempre o da sessão.
export async function obterMinhaConta() {
  const resposta = await api.get('/api/auth/me')

  return resposta.data.data.usuario
}

// Não troca o access token: devolve só o usuário atualizado.
export async function atualizarMeuNome({ nome, senhaAtual }) {
  const resposta = await api.patch('/api/auth/me', { nome, senhaAtual }, semReenvio)

  return resposta.data.data.usuario
}

export async function solicitarTrocaMinhaSenha(senhaAtual) {
  const resposta = await api.post('/api/auth/alterar-senha', { senhaAtual }, semReenvio)
  return resposta.data.data
}

export async function solicitarTrocaMeuEmail({ novoEmail, senhaAtual }) {
  const resposta = await api.post('/api/auth/alterar-email', { novoEmail, senhaAtual }, semReenvio)
  return resposta.data.data
}

export async function confirmarTrocaEmail(token) {
  const resposta = await apiPublica.post('/api/auth/confirmar-email', { token })
  return resposta.data.data
}

export async function excluirMinhaConta(senhaAtual) {
  await api.delete('/api/auth/me', { ...semReenvio, data: { senhaAtual } })
}
