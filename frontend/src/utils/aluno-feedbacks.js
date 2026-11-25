import { converterData, formatarData } from './formatar-data.js'

import {
  marcarConta,
  mesmaConta,
} from './identidade-sessao.js'

// Feedbacks publicados, vindos de GET /api/aluno/redacoes (status AVALIADA,
// notaPublicada e publicadoEm). A página própria saiu (Issue #180): estes
// helpers alimentam o resumo e os itens de Minhas redações.

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

export function formatarPublicacao(redacao) {
  const data = converterData(redacao?.publicadoEm)

  if (!data) {
    return null
  }

  return `Publicado em ${formatarData(data, 'data')}`
}

// Nome do professor da turma da redação, como o backend entrega em tema.turma.professor. Sem o dado,
// devolve null: nada é inventado.
export function obterProfessorDoFeedback(redacao) {
  const nome = redacao?.tema?.turma?.professor?.nome

  return typeof nome === 'string' && nome.trim() !== '' ? nome.trim() : null
}

// Resposta de uma consulta que pertence a uma conta. Enquanto ela corre, outra pessoa pode entrar
// pela reautenticação: o que volta não pode sobrescrever a tela de quem está agora.
export function aplicarRespostaDaConta(estadoAtual, proximo, contaDaResposta) {
  // Chegou de uma conta que já não é a da tela: nem sucesso nem falha podem mexer nela.
  if (!mesmaConta(estadoAtual?.usuarioId, contaDaResposta)) {
    return estadoAtual
  }

  return marcarConta(proximo, contaDaResposta)
}

// Linha do item de Minhas redações com quem corrigiu e quando (Issue #180).
// Só existe com nota publicada, e cada metade some sozinha sem o dado: nada é
// inventado, nem sobra um separador solto.
export function descreverAutoriaDoFeedback(redacao) {
  if (!temFeedbackPublicado(redacao)) return ''

  const professor = obterProfessorDoFeedback(redacao)

  return [professor && `Professor: ${professor}`, formatarPublicacao(redacao)]
    .filter(Boolean)
    .join(' · ')
}
