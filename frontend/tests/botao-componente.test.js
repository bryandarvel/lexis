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
