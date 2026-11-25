import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Link, MemoryRouter } from 'react-router'

let servidor, cache, Botao
before(async () => {
  cache = await mkdtemp(join(tmpdir(), 'lexis-botao-'))
  servidor = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false,
    cacheDir: cache, plugins: [react()], server: { middlewareMode: true }, appType: 'custom' })
  Botao = (await servidor.ssrLoadModule('/src/components/base/Botao.jsx')).default
})
after(async () => {
  await servidor?.close()
  if (cache) await rm(cache, { recursive: true, force: true })
})

const renderizarLink = (props) =>
  renderToStaticMarkup(
    createElement(MemoryRouter, null,
      createElement(Botao, { as: Link, to: '/destino', ...props }, 'Ir')),
  )

test('Link ativo renderiza <a> com href', () => {
  const html = renderizarLink({})

  assert.match(html, /^<a /)
  assert.match(html, /href="\/destino"/)
  assert.doesNotMatch(html, /aria-disabled="/)
  assert.doesNotMatch(html, /tabindex/i)
})

test('Link desabilitado vira span sem href e fora do Tab', () => {
  const html = renderizarLink({ disabled: true })

  assert.match(html, /^<span /)
  assert.doesNotMatch(html, /href=/)
  assert.match(html, /aria-disabled="true"/)
  assert.match(html, /tabindex="-1"/i)
})

test('Link carregando vira span sem href, com aria-busy', () => {
  const html = renderizarLink({ carregando: true })

  assert.match(html, /^<span /)
  assert.doesNotMatch(html, /href=/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /aria-disabled="true"/)
})

test('botão nativo continua <button> e desabilitado quando bloqueado', () => {
  const html = renderToStaticMarkup(createElement(Botao, { disabled: true }, 'Salvar'))

  assert.match(html, /^<button /)
  assert.match(html, /disabled/)
  assert.match(html, /type="button"/)
})

/*
 * Padrão de botões (Issue #186). Os testes olham as classes porque o tamanho
 * real depende do CSS gerado; o que se fixa aqui é o contrato do componente.
 */
const renderizar = (props = {}) =>
  renderToStaticMarkup(createElement(Botao, props, 'Salvar'))

test('o botão padrão tem 44 px, piso de largura e respiro lateral de 24 px', () => {
  const html = renderizar()

  assert.match(html, /\bmin-h-11\b/)
  assert.match(html, /\bmin-w-28\b/)
  assert.match(html, /\bpx-6\b/)
  assert.doesNotMatch(html, /\bpx-5\b/)
})

test('o botão compacto continua compacto: sem piso de largura', () => {
  const html = renderizar({ tamanho: 'compacto' })

  assert.match(html, /\bmin-h-9\b/)
  assert.match(html, /\bpx-3\b/)
  assert.doesNotMatch(html, /\bmin-w-28\b/)
})

test('o botão tem o arredondamento do cartão, e só um raio por vez', () => {
  const html = renderizar()

  assert.match(html, /\brounded-cartao\b/)
  assert.doesNotMatch(html, /\brounded-controle\b/)
  assert.doesNotMatch(html, /\brounded-pilula\b/)
})

test('a forma pílula troca o raio e não soma outro', () => {
  const html = renderizar({ forma: 'pilula' })

  assert.match(html, /\brounded-pilula\b/)
  assert.doesNotMatch(html, /\brounded-cartao\b/)
  assert.doesNotMatch(html, /\brounded-controle\b/)
})

test('forma desconhecida cai no padrão em vez de ficar sem raio', () => {
  assert.match(renderizar({ forma: 'inexistente' }), /\brounded-cartao\b/)
})

test('o contorno usa a cor de ação, sem inventar cor nova', () => {
  const html = renderizar({ variante: 'contorno' })

  assert.match(html, /\bborder-acao\b/)
  assert.match(html, /\btext-acao-texto\b/)
  assert.match(html, /\bbg-transparent\b/)
  // Borda de 2 px, como na referência dos botões de IA, e só essa largura.
  assert.match(html, /\bborder-2\b/)
  assert.doesNotMatch(html, /\bborder\b(?!-)/)
})

test('toda variante comum tem uma largura de borda só: 1 px', () => {
  for (const variante of ['primario', 'secundario', 'perigo', 'fantasma']) {
    const html = renderizar({ variante })

    assert.match(html, /\bborder\b(?!-)/, variante)
    assert.doesNotMatch(html, /\bborder-2\b/, variante)
  }
})

test('as demais variantes não mudaram de cor', () => {
  assert.match(renderizar(), /\bbg-acao\b[^"]*\btext-texto-sobre-acao\b/)
  assert.match(renderizar({ variante: 'secundario' }), /\bborder-borda-campo\b[^"]*\btext-texto\b/)
  assert.match(renderizar({ variante: 'perigo' }), /\bborder-perigo\b[^"]*\btext-perigo\b/)
})
