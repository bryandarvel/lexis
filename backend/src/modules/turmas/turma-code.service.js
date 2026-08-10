import { randomInt } from 'node:crypto'

const ALFABETO_CODIGO =
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const TAMANHO_CODIGO = 8

export function gerarCodigoAcessoTurma() {
  return Array.from(
    { length: TAMANHO_CODIGO },
    () =>
      ALFABETO_CODIGO[
        randomInt(0, ALFABETO_CODIGO.length)
      ],
  ).join('')
}