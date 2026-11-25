import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('explica texto vazio sem atribuir o bloqueio à configuração do LanguageTool', async () => {
  const servidor = await createServer({
    configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false }, appType: 'custom',
  })
  try {
    const { default: Card } = await servidor.ssrLoadModule('/src/components/aluno/RevisaoLinguisticaCard.jsx')
    for (const vazio of [true, false]) {
      const html = renderToStaticMarkup(createElement(Card, {
        textoVazio: vazio, desabilitado: vazio, estado: { status: 'inicial' },
      }))
      assert.equal(html.includes('Escreva um trecho'), vazio)
      assert.equal(/<button[^>]*\sdisabled=""/.test(html), vazio)
      assert.doesNotMatch(html, /desativada neste ambiente/)
    }
    for (const status of ['desativado', 'indisponivel', 'erro']) {
      const html = renderToStaticMarkup(createElement(Card, {
        estado: { status, mensagem: 'Mensagem do serviço' },
      }))
      assert.match(html, /Mensagem do serviço/)
      assert.equal(html.includes('Tentar novamente'), status !== 'desativado')
    }
  } finally {
    await servidor.close()
  }
})
