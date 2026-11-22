import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/*
 * Issue #186. CSS fora de camada vence qualquer utilitário do Tailwind. As
 * regras de piso de área de toque (24 px) estavam fora de camada e, em vez de
 * serem o mínimo, viraram a altura de todo botão em telas de 768 px ou mais:
 * o min-h-11 e o min-h-12 do componente Botao perdiam sempre. Este teste
 * guarda a camada, que é o que a regressão tinha de diferente.
 */
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

const blocoDaCamada = () => {
  const inicio = css.indexOf('@layer base {')

  assert.notEqual(inicio, -1, 'o piso de 24 px precisa estar em @layer base')

  // Fecha na chave que casa com a de abertura.
  let fundo = 0
  for (let i = inicio; i < css.length; i += 1) {
    if (css[i] === '{') fundo += 1
    if (css[i] === '}' && (fundo -= 1) === 0) return css.slice(inicio, i + 1)
  }

  throw new Error('@layer base sem fechamento')
}

test('o piso de 24 px de links e botões vive em @layer base', () => {
  const camada = blocoDaCamada()

  assert.match(camada, /a\[href\]\)[^{]*\{[^}]*min-height:\s*24px/)
  assert.match(camada, /button\s*\{\s*min-height:\s*24px/)
})

test('nenhum piso de 24 px ficou solto fora da camada', () => {
  const foraDaCamada = css.replace(blocoDaCamada(), '')

  assert.doesNotMatch(foraDaCamada, /^\s*button\s*\{\s*min-height:\s*24px/m)
  assert.doesNotMatch(foraDaCamada, /:where\(a\[href\]\)[^{]*\{[^}]*min-height:\s*24px/)
})
