import { apiPublica } from './api.js'

export async function solicitarRecuperacaoSenha({ email }) {
  const resposta = await apiPublica.post('/api/auth/recuperar-senha', { email })
  return resposta.data.data
}

export async function redefinirSenha({ token, senha }) {
  await apiPublica.post('/api/auth/redefinir-senha', { token, senha })
}
