import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAVE_TEMA,
  decidirTemaInicial,
  lerPreferenciaDoSistema,
  lerPreferenciaSalva,
} from '../src/utils/tema.js'

test('a preferência salva vence a do sistema', () => {
  assert.equal(decidirTemaInicial('dark', 'light'), 'dark')
  assert.equal(decidirTemaInicial('light', 'dark'), 'light')
})

test('sem preferência salva, o tema do sistema decide', () => {
  assert.equal(decidirTemaInicial(null, 'dark'), 'dark')
  assert.equal(decidirTemaInicial(null, 'light'), 'light')
  assert.equal(decidirTemaInicial(undefined, 'dark'), 'dark')
})

test('valor salvo inválido é ignorado e cai no sistema', () => {
  assert.equal(decidirTemaInicial('azul', 'dark'), 'dark')
  assert.equal(decidirTemaInicial('', 'dark'), 'dark')
  assert.equal(decidirTemaInicial('DARK', 'light'), 'light')
})

test('sem salva e sem sistema reconhecido, usa o tema claro', () => {
  assert.equal(decidirTemaInicial(null, null), 'light')
  assert.equal(decidirTemaInicial(null, 'sepia'), 'light')
})

test('lê a preferência salva pela chave do projeto', () => {
  const armazenamento = {
    getItem: (chave) => (chave === CHAVE_TEMA ? 'dark' : null),
  }
  assert.equal(lerPreferenciaSalva(armazenamento), 'dark')
  assert.equal(lerPreferenciaSalva({ getItem: () => null }), null)
})

test('armazenamento indisponível não derruba a leitura', () => {
  const queLanca = {
    getItem() {
      throw new Error('acesso negado ao armazenamento')
    },
  }
  assert.equal(lerPreferenciaSalva(queLanca), null)
  assert.equal(lerPreferenciaSalva(undefined), null)
  // Sem armazenamento, a decisão continua sendo a do sistema.
  assert.equal(
    decidirTemaInicial(lerPreferenciaSalva(queLanca), 'dark'),
    'dark',
  )
})

test('lê a preferência do sistema por matchMedia', () => {
  assert.equal(lerPreferenciaDoSistema(() => ({ matches: true })), 'dark')
  assert.equal(lerPreferenciaDoSistema(() => ({ matches: false })), 'light')
})

test('matchMedia ausente ou com erro cai no tema claro', () => {
  assert.equal(lerPreferenciaDoSistema(undefined), 'light')
  assert.equal(lerPreferenciaDoSistema(() => undefined), 'light')
  assert.equal(
    lerPreferenciaDoSistema(() => {
      throw new Error('matchMedia indisponível')
    }),
    'light',
  )
})
