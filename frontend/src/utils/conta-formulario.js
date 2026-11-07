/*
 * Formulários da conta (#71): edição do nome e troca de senha.
 *
 * As regras espelham o backend (PATCH /api/auth/me e POST
 * /api/auth/alterar-senha) para a pessoa ver o erro antes do envio. A força da
 * senha nova reusa validarNovaSenha, a mesma da redefinição por e-mail.
 */
import { validarNovaSenha } from './password-recovery.js'

const NOME_MINIMO = 2
const NOME_MAXIMO = 120
const ERRO_NOME = `O nome deve ter de ${NOME_MINIMO} a ${NOME_MAXIMO} caracteres.`

export function prepararNovoNome(valor, nomeAtual) {
  const nome = String(valor ?? '').trim().replace(/\s+/g, ' ')

  if (nome.length < NOME_MINIMO || nome.length > NOME_MAXIMO) {
    return { nome: null, erro: ERRO_NOME }
  }

  if (nome === String(nomeAtual ?? '').trim()) {
    return { nome: null, erro: 'Altere o nome para salvar.' }
  }

  return { nome, erro: '' }
}

export function prepararTrocaDeSenha({
  senhaAtual = '',
  novaSenha = '',
  confirmacao = '',
} = {}) {
  const erros = {}

  if (senhaAtual === '') {
    erros.senhaAtual = 'Informe a senha atual.'
  }

  const erroNova = validarNovaSenha(novaSenha, confirmacao)

  if (erroNova) {
    // validarNovaSenha devolve a divergência por último; os demais são força.
    if (erroNova.includes('não coincidem')) {
      erros.confirmacao = erroNova
    } else {
      erros.novaSenha = erroNova
    }
  } else if (novaSenha === senhaAtual) {
    erros.novaSenha = 'A nova senha precisa ser diferente da atual.'
  }

  if (Object.keys(erros).length > 0) {
    return { dados: null, erros }
  }

  return { dados: { senhaAtual, novaSenha }, erros: {} }
}

// 401 fica para o interceptor; 422 vira erro por campo; 429 avisa sem repetir.
export function mapearErroDaConta(erro) {
  const resposta = erro?.response
  const vazio = { campos: {}, mensagem: '', repetir: false, sessaoExpirada: false }

  if (!resposta) {
    return {
      ...vazio,
      mensagem: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    }
  }

  if (resposta.status === 401) {
    return { ...vazio, sessaoExpirada: true }
  }

  if (resposta.status === 429) {
    return {
      ...vazio,
      mensagem:
        'Muitas tentativas de alteração de senha. Aguarde alguns minutos e tente de novo.',
    }
  }

  const detalhes = resposta.data?.error?.details

  if (Array.isArray(detalhes) && detalhes.length > 0) {
    const campos = {}

    for (const item of detalhes) {
      if (item?.field && item?.message) {
        campos[item.field] = item.message
      }
    }

    if (Object.keys(campos).length > 0) {
      return { ...vazio, campos }
    }
  }

  return {
    ...vazio,
    mensagem:
      resposta.data?.error?.message ??
      'Não foi possível concluir a alteração. Tente novamente.',
  }
}
