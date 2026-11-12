/*
 * Sequência das consultas de notificações (centrais do aluno e do professor e o sino).
 *
 * A lista e o contador mostram o mesmo número, mas ele chega por dois caminhos: a consulta ao
 * servidor e a ação local de marcar como lido. Uma consulta que começou antes da leitura chega
 * depois dela com o número antigo e desfaz a leitura na tela.
 *
 * Cada estado carrega uma geração. A consulta guarda a geração em que começou e só é aplicada se
 * nada tiver acontecido desde então; marcar como lido e iniciar outra consulta avançam a geração,
 * descartando o que estava em voo. A contagem sai sempre da lista, para o contador não divergir
 * dela.
 */
import { atualizarNotificacaoComoLida } from './notifications.js'

export const GERACAO_INICIAL = 0

export function geracaoDe(estado) {
  return Number.isInteger(estado?.geracao) ? estado.geracao : GERACAO_INICIAL
}

export function avancarGeracao(estado) {
  return { ...estado, geracao: geracaoDe(estado) + 1 }
}

export function respostaVigente(estado, geracao) {
  return geracaoDe(estado) === geracao
}

export function contarNaoLidas(notificacoes) {
  return (Array.isArray(notificacoes) ? notificacoes : []).filter(
    (notificacao) => !notificacao?.lidaEm,
  ).length
}

// Começa uma consulta: devolve o estado já marcado como carregando e a geração que a resposta
// precisa apresentar para ser aceita.
export function iniciarConsulta(estado) {
  const proximo = avancarGeracao({ ...estado, status: 'carregando', mensagem: '' })

  return { estado: proximo, geracao: geracaoDe(proximo) }
}

export function aplicarConsulta(estado, resultado, geracao) {
  // Chegou depois de uma leitura ou de outra consulta: o que está na tela é mais novo.
  if (!respostaVigente(estado, geracao)) {
    return estado
  }

  const notificacoes = Array.isArray(resultado?.notificacoes)
    ? resultado.notificacoes
    : []

  return {
    ...estado,
    status: 'pronto',
    mensagem: '',
    notificacoes,
    totalNaoLidas: contarNaoLidas(notificacoes),
    processandoId: null,
  }
}

export function aplicarFalhaDaConsulta(estado, mensagem, geracao) {
  // A falha de uma consulta vencida não apaga o que já foi mostrado.
  if (!respostaVigente(estado, geracao)) {
    return estado
  }

  return { ...estado, status: 'erro', mensagem, processandoId: null }
}

// Marca o aviso como lido e refaz a contagem a partir da lista. Avança a geração: qualquer
// consulta ainda em voo deixa de valer e não desfaz esta leitura. Só é possível marcar como lido
// com a lista na tela, então o estado fica pronto: uma consulta descartada não deixa a tela presa
// em carregando nem mostra o erro de uma tentativa que já não vale.
export function aplicarLeitura(estado, notificacaoAtualizada) {
  return avancarGeracao({
    ...atualizarNotificacaoComoLida(estado, notificacaoAtualizada),
    status: 'pronto',
    mensagem: '',
    processandoId: null,
  })
}
