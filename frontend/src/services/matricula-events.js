const EVENTO_MATRICULA_ATUALIZADA =
  'lexis:matricula-atualizada'

export function notificarMatriculaAtualizada(detalhe = {}) {
  window.dispatchEvent(
    new CustomEvent(EVENTO_MATRICULA_ATUALIZADA, {
      detail: detalhe,
    }),
  )
}

export function observarMatriculaAtualizada(callback) {
  function tratarEvento(evento) {
    callback(evento.detail ?? {})
  }

  window.addEventListener(
    EVENTO_MATRICULA_ATUALIZADA,
    tratarEvento,
  )

  return () => {
    window.removeEventListener(
      EVENTO_MATRICULA_ATUALIZADA,
      tratarEvento,
    )
  }
}
