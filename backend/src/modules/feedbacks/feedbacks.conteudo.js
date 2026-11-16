import { isDeepStrictEqual } from 'node:util'

import { CAMPOS_COMPETENCIAS } from './feedbacks.competencias.js'

function compararStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

function conteudoPublicavel(versao) {
  return {
    notas: CAMPOS_COMPETENCIAS.map((campo) => versao[campo]),
    comentarioGeral: versao.comentarioGeral,
    criterios: versao.criterios.map(({ criterioId, comentario, trechos }) => ({
      criterioId,
      comentario,
      trechos: trechos.map(({ inicio, fim, trecho }) => ({ inicio, fim, trecho }))
        .sort((a, b) => a.inicio - b.inicio || a.fim - b.fim || compararStrings(a.trecho, b.trecho)),
    })).sort((a, b) => compararStrings(a.criterioId, b.criterioId)),
  }
}

// A ordem do retorno do banco e a procedência de uma marca não são conteúdo.
// Compare apenas o que o professor corrige, sem aparar ou normalizar o texto.
export function mesmoConteudoFeedback(rascunho, publicada) {
  return isDeepStrictEqual(conteudoPublicavel(rascunho), conteudoPublicavel(publicada))
}
