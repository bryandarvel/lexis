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

// 401 fica para o interceptor; 422 vira erro por campo; 429 avisa sem repetir.
export function mapearErroDaConta(erro) {
  const resposta = erro?.response
  const vazio = { campos: {}, mensagem: '', sessaoExpirada: false }

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
        'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    }
  }

  const dados = resposta.data?.error
  const campoDoErro = {
    EMAIL_ALREADY_IN_USE: 'novoEmail',
    EMAIL_UNCHANGED: 'novoEmail',
  }[dados?.code]
  if (campoDoErro && dados.message) {
    return { ...vazio, campos: { [campoDoErro]: dados.message } }
  }

  const detalhes = dados?.details

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
