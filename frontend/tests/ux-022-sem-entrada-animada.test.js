import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

// UX-022: navegação é ação frequente, então nenhuma página do professor sobe
// 8 px nem faz fade ao abrir. A entrada animada foi removida, não trocada.
const PASTA = new URL('../src/pages/professor/', import.meta.url)

test('nenhuma página do professor usa motion nem entrada animada', () => {
  const paginas = readdirSync(PASTA).filter((nome) => nome.endsWith('Page.jsx'))

  assert.ok(paginas.length >= 8)

  for (const nome of paginas) {
    const fonte = readFileSync(new URL(nome, PASTA), 'utf8')

    assert.doesNotMatch(fonte, /from ['"]motion\/react['"]/, nome)
    assert.doesNotMatch(fonte, /motion\./, nome)
    assert.doesNotMatch(fonte, /initial=\{\{/, nome)
  }
})
