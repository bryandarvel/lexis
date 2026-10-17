// Transcrição do OCR aguardando a revisão do aluno. Fica somente em memória
// (nunca em localStorage, sessionStorage ou history.state): recarregar a
// página descarta o texto e a imagem. Guarda uma revisão por vez, vinculada
// ao aluno e à proposta.
let revisaoPendente = null

export function guardarRevisaoOcr({
  usuarioId,
  temaId,
  textoExtraido,
  imagem = null,
  textoAnterior = '',
}) {
  if (
    !usuarioId ||
    !temaId ||
    typeof textoExtraido !== 'string'
  ) {
    throw new TypeError(
      'A revisão do OCR precisa do aluno, da proposta e do texto extraído.',
    )
  }

  revisaoPendente = {
    usuarioId,
    temaId,
    textoExtraido,
    imagem,
    textoAnterior:
      typeof textoAnterior === 'string'
        ? textoAnterior
        : '',
  }
}

export function obterRevisaoOcr({
  usuarioId,
  temaId,
}) {
  if (
    !revisaoPendente ||
    revisaoPendente.usuarioId !== usuarioId ||
    revisaoPendente.temaId !== temaId
  ) {
    return null
  }

  return revisaoPendente
}

export function descartarRevisaoOcr() {
  revisaoPendente = null
}
