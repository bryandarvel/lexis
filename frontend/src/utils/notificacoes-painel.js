/*
 * Regras do painel de avisos aberto pelo sino (Lote 5, §9B). Funções puras:
 * quais avisos entram, que contexto mostrar, como escrever a data e a contagem.
 * O desenho fica em components/layout/PainelAvisos.jsx.
 */

export const LIMITE_AVISOS_NO_PAINEL = 10

function texto(valor) {
  const limpo = typeof valor === 'string' ? valor.trim() : ''

  return limpo === '' ? null : limpo
}

function instante(valor) {
  const tempo = new Date(valor).getTime()

  return Number.isNaN(tempo) ? 0 : tempo
}

// Os dez mais recentes, do mais novo para o mais antigo. O servidor já devolve
// nessa ordem; ordenar de novo não depende disso e não altera a lista original.
export function selecionarAvisosRecentes(
  notificacoes,
  limite = LIMITE_AVISOS_NO_PAINEL,
) {
  const lista = Array.isArray(notificacoes) ? notificacoes : []

  return [...lista]
    .sort((a, b) => instante(b?.criadaEm) - instante(a?.criadaEm))
    .slice(0, limite)
}

// Proposta e turma que a API já devolve em redacao.tema (enunciado e
// turma.{id,nome}). Avisos sem redação, como os de matrícula, não têm contexto.
export function obterContextoDoAviso(notificacao) {
  const tema = notificacao?.redacao?.tema

  return {
    proposta: texto(tema?.enunciado),
    turma: texto(tema?.turma?.nome),
  }
}

export function descreverContagemDoPainel(total) {
  const quantidade = Number.isInteger(total) && total > 0 ? total : 0

  if (quantidade === 0) return 'Nenhum aviso não lido'
  if (quantidade === 1) return '1 não lido'

  return `${quantidade} não lidos`
}
