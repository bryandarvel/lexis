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

// Resumo do que o Painel mostra. O backend (GET /api/aluno/desempenho, desempenho.service.js) devolve
// mediaGeral já arredondada para 1 casa e totalCorrigidas; o Painel arredonda esse valor para inteiro
// (formatarIndicador). Arredondar a média crua direto para inteiro divergia de x,45 a x,49 (832,49 dava 832
// aqui e 833 no Painel). Com o desempenho disponível usa-se o valor do backend; sem ele, a mesma regra em duas
// etapas aplicada à lista. Não indica evolução nem compara períodos.
function mediaComoNoBackend(notas) {
  const media = notas.reduce((total, nota) => total + nota, 0) / notas.length

  return Math.round(Math.round(media * 10) / 10)
}

export function resumirFeedbacks(feedbacks, desempenho = null) {
  const lista = Array.isArray(feedbacks) ? feedbacks : []
  const doBackend =
    desempenho &&
    Number.isFinite(desempenho.mediaGeral) &&
    Number.isInteger(desempenho.totalCorrigidas) &&
    desempenho.totalCorrigidas > 0

  if (doBackend) {
    return {
      quantidade: desempenho.totalCorrigidas,
      media: Math.round(desempenho.mediaGeral),
    }
  }

  if (lista.length === 0) {
    return { quantidade: 0, media: null }
  }

  return {
    quantidade: lista.length,
    media: mediaComoNoBackend(lista.map((redacao) => redacao.notaPublicada)),
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

// Nome do professor da turma da redação, como o backend entrega em tema.turma.professor. Sem o dado,
// devolve null: nada é inventado.
export function obterProfessorDoFeedback(redacao) {
  const nome = redacao?.tema?.turma?.professor?.nome

  return typeof nome === 'string' && nome.trim() !== '' ? nome.trim() : null
}
