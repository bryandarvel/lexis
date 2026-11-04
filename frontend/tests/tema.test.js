import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAVE_TEMA,
  decidirTemaInicial,
  lerPreferenciaSalva,
} from '../src/utils/tema.js'

const armazenamentoCom = (valor) => ({
  getItem: (chave) => (chave === CHAVE_TEMA ? valor : null),
})

test('sem escolha salva, abre claro', () => {
  assert.equal(decidirTemaInicial(lerPreferenciaSalva(armazenamentoCom(null))), 'light')
  assert.equal(decidirTemaInicial(undefined), 'light')
  assert.equal(decidirTemaInicial(null), 'light')
})

test('sem escolha salva, abre claro mesmo com o sistema no escuro', () => {
  const original = globalThis.matchMedia
  let consultas = 0

  globalThis.matchMedia = () => {
    consultas += 1
    return { matches: true }
  }

  try {
    const tema = decidirTemaInicial(lerPreferenciaSalva(armazenamentoCom(null)))

    assert.equal(tema, 'light')
    assert.equal(consultas, 0, 'o tema do sistema não deve ser consultado')
  } finally {
    if (original === undefined) delete globalThis.matchMedia
    else globalThis.matchMedia = original
  }
})

test('a escolha salva, clara ou escura, é respeitada', () => {
  assert.equal(lerPreferenciaSalva(armazenamentoCom('dark')), 'dark')
  assert.equal(lerPreferenciaSalva(armazenamentoCom('light')), 'light')
  assert.equal(decidirTemaInicial('dark'), 'dark')
  assert.equal(decidirTemaInicial('light'), 'light')
})

test('valor salvo inválido cai em claro', () => {
  for (const invalido of ['azul', '', 'DARK', 'system', '1']) {
    assert.equal(lerPreferenciaSalva(armazenamentoCom(invalido)), null)
    assert.equal(decidirTemaInicial(invalido), 'light')
  }
})

test('armazenamento indisponível não derruba a leitura e abre claro', () => {
  const queLanca = {
    getItem() {
      throw new Error('acesso negado ao armazenamento')
    },
  }

  assert.equal(lerPreferenciaSalva(queLanca), null)
  assert.equal(lerPreferenciaSalva(undefined), null)
  assert.equal(decidirTemaInicial(lerPreferenciaSalva(queLanca)), 'light')
})
