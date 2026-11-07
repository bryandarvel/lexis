function cortaParSurrogate(texto, indice) {
  const anterior = texto.charCodeAt(indice - 1), atual = texto.charCodeAt(indice)
  return anterior >= 0xD800 && anterior <= 0xDBFF && atual >= 0xDC00 && atual <= 0xDFFF
}

export function trechoLiteralValido(texto, { inicio, fim, trecho }) {
  return typeof texto === 'string' && Number.isSafeInteger(inicio) && Number.isSafeInteger(fim) &&
    inicio >= 0 && fim > inicio && fim <= texto.length &&
    !cortaParSurrogate(texto, inicio) && !cortaParSurrogate(texto, fim) && texto.slice(inicio, fim) === trecho
}

export function coincideComEvidenciaIa(analise, criterio, trecho) {
  const snapshot = Array.isArray(analise?.criteriosSnapshot)
    ? analise.criteriosSnapshot.find(c => c.id === criterio.id && c.ordem === criterio.ordem && c.nome === criterio.nome) : null
  const resultados = analise?.resultadoEstruturado?.analisePorCriterio
  if (!snapshot || !Array.isArray(resultados)) return false
  const resultado = resultados.find(c => c.ordem === snapshot.ordem && c.criterio === snapshot.nome)
  return Array.isArray(resultado?.evidencias) && resultado.evidencias.some(e =>
    e.statusLocalizacao === 'LOCALIZADA' && e.inicio === trecho.inicio && e.fim === trecho.fim && e.trecho === trecho.trecho)
}
