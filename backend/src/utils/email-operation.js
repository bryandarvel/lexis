const ESTADOS_EMAIL = ['PENDENTE', 'ENVIANDO', 'ENVIADO', 'ERRO']

export function validarBancoLocalEmail({ ambiente, url }) {
  let destino
  try {
    destino = new URL(url)
  } catch {
    throw new Error('Destino local de e-mail inválido.')
  }
  const banco = decodeURIComponent(destino.pathname.slice(1))
  if (ambiente === 'production' ||
      !['mysql:', 'mariadb:'].includes(destino.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname) ||
      !['lexis', 'lexis_test'].includes(banco)) {
    throw new Error('A consulta aceita apenas lexis ou lexis_test local, fora de produção.')
  }
  return banco
}

export function resumirContagensEmail(grupos) {
  const resumo = Object.fromEntries(ESTADOS_EMAIL.map((estado) => [estado, 0]))
  for (const grupo of grupos) {
    const quantidade = grupo._count?._all
    if (!ESTADOS_EMAIL.includes(grupo.statusEmail) ||
        !Number.isSafeInteger(quantidade) || quantidade < 0) {
      throw new Error('Contagem da fila inválida.')
    }
    resumo[grupo.statusEmail] += quantidade
  }
  return resumo
}
