/*
 * Isolamento por conta nas páginas do aluno.
 *
 * Depois de uma reautenticação como outra pessoa, o que já estava carregado em
 * memória não pode continuar na tela, e as respostas pedidas pela conta
 * anterior não podem preencher a tela da conta nova. Cada estado carrega o id
 * da conta que o originou: o que não for da conta atual não é exibido nem
 * aceito. Reautenticar na mesma conta mantém tudo, porque o id não muda.
 */

export function normalizarIdConta(usuarioId) {
  return typeof usuarioId === 'string' && usuarioId !== ''
    ? usuarioId
    : null
}

export function mesmaConta(umId, outroId) {
  return normalizarIdConta(umId) === normalizarIdConta(outroId)
}

// Marca o estado com a conta que o originou, para o render e as respostas
// poderem ser conferidas depois.
export function marcarConta(estado, usuarioId) {
  return { ...estado, usuarioId: normalizarIdConta(usuarioId) }
}

export function ehDaContaAtual(estado, usuarioId) {
  return Boolean(estado) && mesmaConta(estado.usuarioId, usuarioId)
}

// Usado no render: devolve o estado só quando ele pertence à conta atual. Na
// troca de conta devolve o estado inicial, então os dados somem na hora, sem
// esperar a nova consulta terminar.
export function estadoDaContaAtual(estado, usuarioId, estadoInicial) {
  return ehDaContaAtual(estado, usuarioId) ? estado : estadoInicial
}
