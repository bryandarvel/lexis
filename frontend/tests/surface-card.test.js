import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/*
 * Issue #177. Dois defeitos do cartão da tela de nova proposta, os dois
 * invisíveis em teste de comportamento:
 *
 * 1. `box-shadow: inset …, var(--shadow-card)` com `--shadow-card: none` no
 *    tema escuro é uma lista inválida, e o navegador descarta a declaração
 *    inteira. O cartão ficava sem sombra E sem o brilho de topo.
 * 2. O <legend> nativo fica sobre a borda do fieldset e ignora o padding, o
 *    que punha o título fora do cartão.
 */

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const novaProposta = readFileSync(
  new URL('../src/pages/professor/ProfessorNovoTemaPage.jsx', import.meta.url),
  'utf8',
)

const blocoDe = (seletor) => {
  const inicio = css.indexOf(seletor)

  assert.notEqual(inicio, -1, `não achei ${seletor}`)

  return css.slice(inicio, css.indexOf('}', inicio))
}

test('o cartão de conteúdo tira todo o relevo de uma variável só', () => {
  const regra = blocoDe('.surface-card {')

  assert.match(regra, /box-shadow:\s*var\(--shadow-card\)/)
  // Compor a lista aqui é o que quebrava: um `none` no meio derruba tudo.
  assert.doesNotMatch(regra, /box-shadow:[^;]*,/)
})

test('nenhum tema zera o relevo do cartão com `none`', () => {
  for (const seletor of [':root[data-theme="light"] {', ':root[data-theme="dark"] {']) {
    const sombra = blocoDe(seletor).match(/--shadow-card:\s*([^;]+);/)

    assert.ok(sombra, `${seletor} precisa definir --shadow-card`)
    assert.notEqual(sombra[1].trim(), 'none', seletor)
  }
})

test('o tema escuro mantém o brilho de topo que a lista inválida comia', () => {
  assert.match(
    blocoDe(':root[data-theme="dark"] {'),
    /--shadow-card:\s*inset [^;]*var\(--surface-highlight\)/,
  )
})

test('os critérios continuam agrupados por um legend, com título visível à parte', () => {
  // Sem o legend o leitor de tela deixa de anunciar o grupo em cada campo.
  assert.match(novaProposta, /<legend className="sr-only">Critérios de avaliação<\/legend>/)
  assert.match(novaProposta, /<h2 className="text-xl font-semibold text-texto">\s*Critérios de avaliação/)
  // O legend não pode voltar a ser o título desenhado: é ele que sobe na borda.
  assert.doesNotMatch(novaProposta, /<legend className="(?!sr-only)/)
})
