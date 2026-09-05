export function obterLinkNotificacao(notificacao) {
  const redacaoId =
    notificacao.feedbackVersao?.feedback?.redacaoId

  return redacaoId
    ? `/aluno/redacoes/${encodeURIComponent(redacaoId)}/feedback`
    : '/aluno'
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
