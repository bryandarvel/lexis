// Lista "Feedbacks": só as redações com nota publicada, vindas de
// GET /api/aluno/redacoes (status AVALIADA, notaPublicada e publicadoEm).

export const ORDENACOES_FEEDBACK = [
  { valor: 'recentes', rotulo: 'Publicação mais recente' },
  { valor: 'antigas', rotulo: 'Publicação mais antiga' },
  { valor: 'maior-nota', rotulo: 'Maior nota' },
  { valor: 'menor-nota', rotulo: 'Menor nota' },
]

function converterData(valor) {
  if (!valor) {
    return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data
}

export function temFeedbackPublicado(redacao) {
  return (
    redacao?.status === 'AVALIADA' &&
    Boolean(redacao.id) &&
    Number.isInteger(redacao.notaPublicada)
  )
}

export function selecionarFeedbacks(redacoes) {
  return (Array.isArray(redacoes) ? redacoes : []).filter(
    temFeedbackPublicado,
  )
}

function momentoDaPublicacao(redacao) {
  const data = converterData(redacao.publicadoEm)

  return data ? data.getTime() : 0
}

export function ordenarFeedbacks(feedbacks, ordenacao = 'recentes') {
  const lista = Array.isArray(feedbacks) ? [...feedbacks] : []
  const porData = (a, b) =>
    momentoDaPublicacao(b) - momentoDaPublicacao(a)

  if (ordenacao === 'antigas') {
    return lista.sort((a, b) => -porData(a, b))
  }

  if (ordenacao === 'maior-nota') {
    return lista.sort(
      (a, b) => b.notaPublicada - a.notaPublicada || porData(a, b),
    )
  }

  if (ordenacao === 'menor-nota') {
    return lista.sort(
      (a, b) => a.notaPublicada - b.notaPublicada || porData(a, b),
    )
  }

  return lista.sort(porData)
}

// Média simples das notas publicadas, arredondada para inteiro. Não indica
// evolução nem compara períodos: é só a média do que já foi publicado.
export function resumirFeedbacks(feedbacks) {
  const lista = Array.isArray(feedbacks) ? feedbacks : []

  if (lista.length === 0) {
    return { quantidade: 0, media: null }
  }

  const soma = lista.reduce(
    (total, redacao) => total + redacao.notaPublicada,
    0,
  )

  return {
    quantidade: lista.length,
    media: Math.round(soma / lista.length),
  }
}

export function descreverQuantidade(quantidade) {
  if (quantidade === 0) {
    return 'Nenhum feedback publicado.'
  }

  return quantidade === 1
    ? '1 feedback publicado.'
    : `${quantidade} feedbacks publicados.`
}

export function formatarPublicacao(redacao) {
  const data = converterData(redacao?.publicadoEm)

  if (!data) {
    return null
  }

  return `Publicado em ${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(data)}`
}

export function caminhoDoFeedback(redacao) {
  return `/aluno/redacoes/${encodeURIComponent(redacao.id)}/feedback`
}
