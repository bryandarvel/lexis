export function normalizarCodigoAcesso(valor = '') {
  return valor.replace(/\s+/g, '').toUpperCase()
}
