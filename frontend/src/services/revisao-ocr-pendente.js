import { revisaoPertenceA } from '../utils/ocr-revisao.js'

// Transcrição do OCR aguardando a revisão do aluno. Fica somente em memória
// (nunca em localStorage, sessionStorage ou history.state): recarregar a
// página descarta o texto e a imagem. Guarda uma revisão por vez, vinculada
// ao aluno e à proposta, com a transcrição original e o texto já editado.
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
    textoRevisado: textoExtraido,
    imagem,
    textoAnterior:
      typeof textoAnterior === 'string'
        ? textoAnterior
        : '',
  }
}

export function obterRevisaoOcr(vinculo) {
  return revisaoPertenceA(revisaoPendente, vinculo)
    ? revisaoPendente
    : null
}

// Preserva as edições do aluno para que a página, ao ser montada de novo,
// mostre o texto revisado em vez da transcrição original. Só altera a
// revisão do mesmo aluno e da mesma proposta.
export function atualizarTextoRevisaoOcr({
  usuarioId,
  temaId,
  texto,
}) {
  if (
    typeof texto !== 'string' ||
    !revisaoPertenceA(revisaoPendente, {
      usuarioId,
      temaId,
    })
  ) {
    return false
  }

  revisaoPendente = {
    ...revisaoPendente,
    textoRevisado: texto,
  }

  return true
}

export function descartarRevisaoOcr() {
  revisaoPendente = null
}
