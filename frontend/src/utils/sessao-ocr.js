/*
 * Descarte da revisão de OCR na troca de conta (#49).
 *
 * O diálogo de reautenticação tem e-mail editável, então outra pessoa pode
 * entrar sem passar por logout. A revisão pendente (transcrição, texto editado
 * e imagem) fica em memória e precisa sair junto quando a conta muda de fato.
 * Reautenticar na mesma conta preserva a revisão, e o primeiro login não tem
 * conta anterior para descartar.
 */
function normalizarId(valor) {
  return typeof valor === 'string' && valor !== '' ? valor : null
}

export function deveDescartarRevisaoOcr(idAnterior, idNovo) {
  const anterior = normalizarId(idAnterior)
  const novo = normalizarId(idNovo)

  return Boolean(anterior) && Boolean(novo) && anterior !== novo
}
