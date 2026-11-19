import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

import {
  ABAS_ENTRADA,
  indiceDaAba,
  pontoDePartida,
} from '../src/utils/alternancia-entrada.js'

test('as abas de entrada são Entrar e Criar conta, nessa ordem', () => {
  assert.deepEqual(
    ABAS_ENTRADA.map((item) => [item.chave, item.rota]),
    [['entrar', '/login'], ['cadastro', '/cadastro']],
  )
})

test('indiceDaAba responde pela posição e ignora aba desconhecida', () => {
  assert.equal(indiceDaAba('entrar'), 0)
  assert.equal(indiceDaAba('cadastro'), 1)
  assert.equal(indiceDaAba('redefinir'), null)
  assert.equal(indiceDaAba(null), null)
  assert.equal(indiceDaAba(undefined), null)
})

test('a pílula parte da aba anterior quando houve alternância', () => {
  assert.equal(pontoDePartida('entrar', 'cadastro'), 0)
  assert.equal(pontoDePartida('cadastro', 'entrar'), 1)
})

test('sem aba anterior conhecida a pílula já nasce no destino', () => {
  assert.equal(pontoDePartida(undefined, 'cadastro'), 1)
  assert.equal(pontoDePartida(null, 'entrar'), 0)
  assert.equal(pontoDePartida('redefinir', 'entrar'), 0)
})

test('tela sem alternância não tem pílula a posicionar', () => {
  assert.equal(pontoDePartida('entrar', null), null)
  assert.equal(pontoDePartida(null, null), null)
})

let servidor, cache, CascaEntrada, ThemeProvider
before(async () => {
  cache = await mkdtemp(join(tmpdir(), 'lexis-entrada-'))
  servidor = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    cacheDir: cache,
    plugins: [react()],
    server: { middlewareMode: true },
    appType: 'custom',
  })
  CascaEntrada = (
    await servidor.ssrLoadModule('/src/components/auth/CascaEntrada.jsx')
  ).default
  // A casca traz o ThemeToggle, que exige o provider de tema.
  ThemeProvider = (
    await servidor.ssrLoadModule('/src/contexts/ThemeProvider.jsx')
  ).default
})
after(async () => {
  await servidor?.close()
  if (cache) await rm(cache, { recursive: true, force: true })
})

const renderizar = (aba, entrada) =>
  renderToStaticMarkup(
    createElement(
      ThemeProvider,
      null,
      createElement(
        MemoryRouter,
        { initialEntries: [entrada] },
        createElement(CascaEntrada, { titulo: 'Título', aba }),
      ),
    ),
  )

test('a pílula é desenhada na aba marcada, não na de partida', () => {
  const html = renderizar('cadastro', {
    pathname: '/cadastro',
    state: { abaAnterior: 'entrar' },
  })

  assert.match(html, /--aba-visivel:1/)
  assert.match(html, /--aba-partida:0/)
  assert.match(html, /aria-current="page"[^>]*>Criar conta/)
})

test('a alternância anima só quando veio da outra aba', () => {
  const comTroca = renderizar('entrar', {
    pathname: '/login',
    state: { abaAnterior: 'cadastro' },
  })
  const semTroca = renderizar('entrar', { pathname: '/login' })

  assert.match(comTroca, /data-deslizar="true"/)
  assert.match(comTroca, /--aba-partida:1/)
  assert.doesNotMatch(semTroca, /data-deslizar/)
  assert.match(semTroca, /--aba-visivel:0/)
})

test('o link da outra aba leva de qual aba partiu', () => {
  const html = renderizar('entrar', { pathname: '/login' })

  // O estado da navegação não aparece no HTML: o que dá para afirmar aqui é
  // que a aba atual é texto e só a outra é link.
  assert.match(html, /<a[^>]+href="\/cadastro"[^>]*>Criar conta<\/a>/)
  assert.doesNotMatch(html, /<a[^>]+href="\/login"/)
})

test('quem pede menos movimento não vê a pílula deslizar', () => {
  const css = readFileSync(
    new URL('../src/components/auth/casca-entrada.css', import.meta.url),
    'utf8',
  )
  const reduzido = css.slice(css.indexOf('@media (prefers-reduced-motion'))

  // `.login-page *` é menos específico que `.login-tabs__pilula[data-deslizar]`
  // e sozinho não desligaria a animação.
  assert.match(reduzido, /\.login-tabs__pilula\[data-deslizar\]\s*\{\s*animation:\s*none/)
})

test('a redefinição de senha continua sem a alternância', () => {
  const html = renderizar(null, { pathname: '/redefinir-senha' })

  assert.doesNotMatch(html, /login-tabs/)
})
