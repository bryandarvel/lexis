import api from './api.js'

// Vale para ALUNO e PROFESSOR; o identificado é sempre o da sessão.
export async function obterMinhaConta() {
  const resposta = await api.get('/api/auth/me')

  return resposta.data.data.usuario
}

// Não troca o access token: devolve só o usuário atualizado.
export async function atualizarMeuNome(nome) {
  const resposta = await api.patch('/api/auth/me', { nome })

  return resposta.data.data.usuario
}

// Devolve usuário e um access token novo, além do cookie de refresh. A sessão
// que trocou a senha continua valendo; as outras são revogadas no servidor.
export async function alterarMinhaSenha({ senhaAtual, novaSenha }) {
  const resposta = await api.post('/api/auth/alterar-senha', {
    senhaAtual,
    novaSenha,
  })

  return resposta.data.data
}
