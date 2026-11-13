import api from './api.js'

export async function obterMinhaConta() {
  const resposta = await api.get('/api/auth/me')

  return resposta.data.data.usuario
}
