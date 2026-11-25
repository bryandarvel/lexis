// Avisos de correção publicada. Os demais tipos (matrícula encerrada, turma
// arquivada e o que o backend vier a acrescentar) não têm feedback vinculado:
// chegam com feedbackVersao e redacao nulos e não abrem correção nenhuma.
const TIPOS_COM_FEEDBACK = new Set([
  'FEEDBACK_PUBLICADO',
  'FEEDBACK_CORRIGIDO',
])

function obterRedacaoDoFeedback(notificacao) {
  if (!TIPOS_COM_FEEDBACK.has(notificacao?.tipo)) {
    return null
  }

  return notificacao.feedbackVersao?.feedback?.redacaoId ?? null
}

export function obterLinkNotificacao(notificacao) {
  const redacaoId =
    notificacao.feedbackVersao?.feedback?.redacaoId

  return redacaoId
    ? `/aluno/redacoes/${encodeURIComponent(redacaoId)}/feedback`
    : '/aluno'
}

// Rótulo e destino de cada aviso. Sem feedback vinculado não há para onde ir:
// o aviso só é marcado como lido, em vez de prometer uma correção que não
// existe. Um tipo desconhecido cai nesse mesmo caminho, sem quebrar a tela.
export function descreverAcaoNotificacao(notificacao) {
  const redacaoId = obterRedacaoDoFeedback(notificacao)

  if (redacaoId) {
    return {
      destino: `/aluno/redacoes/${encodeURIComponent(redacaoId)}/feedback`,
      rotulo: 'Ver correção →',
      rotuloProcessando: 'Abrindo correção...',
      acionavel: true,
    }
  }

  const lido = Boolean(notificacao?.lidaEm)

  return {
    destino: null,
    rotulo: lido ? 'Lido' : 'Marcar como lido',
    rotuloProcessando: 'Marcando como lido...',
    acionavel: !lido,
  }
}

export function atualizarNotificacaoComoLida(
  estado,
  notificacaoAtualizada,
) {
  const notificacoes = estado.notificacoes.map(
    (notificacao) =>
      notificacao.id === notificacaoAtualizada.id
        ? notificacaoAtualizada
        : notificacao,
  )

  return {
    ...estado,
    notificacoes,
    totalNaoLidas: notificacoes.filter(
      (notificacao) => !notificacao.lidaEm,
    ).length,
  }
}
