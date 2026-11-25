import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/*
 * Issue #188. O menu lateral deixou de ser navy e passou a ter superfície
 * própria por tema; a barra manteve a cor. Como nada disso aparece em teste de
 * comportamento, o que se guarda aqui é o contrato das cores e da moldura.
 */
const css = readFileSync(new URL('../src/layouts/app-shell.css', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../src/layouts/AppShell.jsx', import.meta.url), 'utf8')

const bloco = (seletor) => {
  const inicio = css.indexOf(seletor)

  assert.notEqual(inicio, -1, `não achei ${seletor}`)

  return css.slice(inicio, css.indexOf('}', inicio))
}

test('a barra continua navy: a Issue pediu para manter a cor', () => {
  assert.match(bloco('.casca-barra {'), /background:\s*var\(--superficie-shell\)/)
})

test('o menu lateral não é mais navy e se separa da página por uma borda', () => {
  const trilho = bloco('.casca-trilho {')

  assert.match(trilho, /background:\s*var\(--trilho-fundo\)/)
  assert.doesNotMatch(trilho, /var\(--superficie-shell\)/)
  assert.match(trilho, /border-right:\s*1px solid var\(--trilho-borda\)/)
})

test('o tema escuro tem versão própria, e não herda o ícone navy do claro', () => {
  const escuro = bloco('[data-theme="dark"] .casca {')

  // Sem isto o ícone ficaria #002049 sobre superfície escura: invisível.
  assert.match(escuro, /--trilho-icone:\s*var\(--acao-texto\)/)
  assert.match(escuro, /--trilho-moldura-ativa:\s*var\(--acao\)/)
  assert.match(escuro, /--trilho-icone-ativo:/)
})

test('no claro o ícone usa o mesmo azul escuro da barra', () => {
  assert.match(bloco('.casca {'), /--trilho-icone:\s*var\(--superficie-shell\)/)
})

test('o item atual é marcado pela moldura, que inverte de cor', () => {
  const ativo = bloco('.casca-item[aria-current="page"] .casca-item-icone {')

  assert.match(ativo, /background:\s*var\(--trilho-moldura-ativa\)/)
  assert.match(ativo, /color:\s*var\(--trilho-icone-ativo\)/)
})

test('o item atual também tem a marca na borda, na cor da moldura', () => {
  const marca = bloco('.casca-item[aria-current="page"]::before {')

  assert.match(marca, /width:\s*3px/)
  // Mesma cor da moldura cheia: acompanha o tema sem valor próprio.
  assert.match(marca, /background:\s*var\(--trilho-moldura-ativa\)/)
})

test('o anel de foco do menu volta ao padrão, que é o legível na superfície nova', () => {
  const foco = bloco('.casca-barra :focus-visible {')

  assert.match(foco, /outline-color:\s*var\(--foco-sobre-shell\)/)
  // O seletor do trilho não pode continuar no mesmo grupo: lá o anel claro
  // some sobre o fundo claro.
  assert.doesNotMatch(css, /\.casca-trilho :focus-visible,?\s*\{[^}]*foco-sobre-shell/)
  assert.doesNotMatch(css, /\.casca-barra :focus-visible,\s*\.casca-trilho :focus-visible/)
})

test('todo item de navegação desenha a moldura do ícone', () => {
  assert.match(shell, /<span aria-hidden="true" className="casca-item-icone">/)
  assert.match(shell, /<IconeDaNavegacao chave=\{item\.chave\} \/>/)
})

test('"Sair" fica no fim do menu e reaproveita o handleSair da casca (Issue #190)', () => {
  assert.match(shell, /<ul className="casca-trilho-fim">/)
  assert.match(shell, /handleSair\(\)/)
  // Uma só lógica de logout: o menu do usuário e o menu lateral chamam a mesma função.
  assert.equal((shell.match(/await sair\(\)/g) ?? []).length, 1)
  assert.match(bloco('.casca-trilho .casca-trilho-fim {'), /margin-top:\s*auto/)
})
