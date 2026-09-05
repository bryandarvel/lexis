const EVENTO_NOTIFICACOES_ATUALIZADAS =
  'lexis:notificacoes-atualizadas'

export function notificarContagemAtualizada(totalNaoLidas) {
  window.dispatchEvent(
    new CustomEvent(EVENTO_NOTIFICACOES_ATUALIZADAS, {
      detail: { totalNaoLidas },
    }),
  )
}

export function observarContagemNotificacoes(callback) {
  function tratarEvento(evento) {
    callback(evento.detail.totalNaoLidas)
  }

  window.addEventListener(
    EVENTO_NOTIFICACOES_ATUALIZADAS,
    tratarEvento,
  )

  return () => {
    window.removeEventListener(
      EVENTO_NOTIFICACOES_ATUALIZADAS,
      tratarEvento,
    )
  }
}
