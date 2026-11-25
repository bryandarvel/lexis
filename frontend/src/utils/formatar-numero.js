/*
 * Formatação numérica da interface (Lote 3a, UX-032). Centraliza as opções de
 * Intl.NumberFormat para que notas, contagens e tamanhos usem o mesmo padrão
 * pt-BR. Combine com a classe .numeros-tabulares ao exibir o resultado.
 */

import { LOCALE } from './formatar-data.js'

const formatadores = new Map()

function obterFormatador(casasMaximas) {
  if (!formatadores.has(casasMaximas)) {
    formatadores.set(
      casasMaximas,
      new Intl.NumberFormat(LOCALE, { maximumFractionDigits: casasMaximas }),
    )
  }

  return formatadores.get(casasMaximas)
}

export function formatarNumero(valor, { casas = 0, vazio = null } = {}) {
  if (valor === null || valor === undefined || valor === '') {
    return vazio
  }

  const numero = Number(valor)

  return Number.isFinite(numero) ? obterFormatador(casas).format(numero) : vazio
}
