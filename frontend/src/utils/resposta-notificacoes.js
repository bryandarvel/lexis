/*
 * Quem pode escrever na tela de notificações.
 *
 * Uma consulta ao servidor pode voltar tarde demais: foi cancelada, outra mais nova começou, ou
 * quem pediu já não é quem está na tela. Nesses casos ela não pode atualizar a lista nem avisar o
 * sino — o evento de contagem é global, então uma resposta vencida contamina o sino de quem entrou
 * depois.
 *
 * O sinalizador de montagem não resolve isso sozinho: quando a conta muda, o efeito antigo é
 * limpo e o novo marca montado de novo, então a resposta atrasada da conta anterior encontra o
 * sinalizador ligado. Da mesma forma, a geração sozinha não basta: cada conta recomeça a contagem
 * do zero, e a geração de uma coincide com a da outra.
 */
import { mesmaConta } from './identidade-sessao.js'
import { respostaVigente } from './notificacoes-sequencia.js'

export function respostaDeveSerAplicada({
  montado = true,
  cancelada = false,
  contaDaConsulta = null,
  contaAtual = null,
  estadoAtual = null,
  geracao = 0,
} = {}) {
  if (!montado || cancelada) {
    return false
  }

  // Sem sessão não há tela para escrever.
  if (!contaDaConsulta || !contaAtual) {
    return false
  }

  // Quem pediu já não é quem está na tela: nem a lista nem o sino podem receber isto.
  if (!mesmaConta(contaDaConsulta, contaAtual)) {
    return false
  }

  // Uma leitura local ou outra consulta aconteceu desde então.
  return respostaVigente(estadoAtual, geracao)
}
