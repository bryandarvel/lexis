/*
 * Alternância "Entrar / Criar conta" das telas de entrada (UX-002).
 *
 * /login e /cadastro são páginas diferentes: a casca remonta a cada troca e a
 * pílula do seletor nasceria já na posição final, sem transição nenhuma. Para
 * que a troca seja contínua, o link da aba leva no estado da navegação de qual
 * aba partiu, e a pílula começa ali antes de ir para a atual.
 *
 * Funções puras: a posição é decidida aqui e o desenho fica no CascaEntrada.
 */

export const ABAS_ENTRADA = [
  { chave: 'entrar', rotulo: 'Entrar', rota: '/login' },
  { chave: 'cadastro', rotulo: 'Criar conta', rota: '/cadastro' },
]

export function indiceDaAba(aba) {
  const indice = ABAS_ENTRADA.findIndex((item) => item.chave === aba)

  return indice === -1 ? null : indice
}

/*
 * De onde a pílula parte ao montar. Sem aba anterior conhecida — primeira
 * visita, recarregamento ou endereço digitado — ela já nasce no destino e não
 * há transição, que é o certo: não houve alternância.
 */
export function pontoDePartida(abaAnterior, abaAtual) {
  const destino = indiceDaAba(abaAtual)

  if (destino === null) return null

  const origem = indiceDaAba(abaAnterior)

  return origem === null ? destino : origem
}
