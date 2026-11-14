import { REGRA_SENHA } from './senha.js'

export function obterTokenRecuperacao(fragmento) {
  const token = new URLSearchParams(fragmento.replace(/^#/, '')).get('token')
  return /^[a-f0-9]{64}$/.test(token ?? '') ? token : ''
}

export function validarNovaSenha(senha, confirmacao) {
  if (senha.length < 10 || senha.length > 72 || new TextEncoder().encode(senha).length > 72 || !/[a-z]/.test(senha) || !/[A-Z]/.test(senha) || !/\d/.test(senha)) {
    return REGRA_SENHA
  }
  return senha === confirmacao ? '' : 'As senhas não coincidem.'
}
