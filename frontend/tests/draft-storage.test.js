import assert from 'node:assert/strict'
import {
  afterEach,
  beforeEach,
  test,
} from 'node:test'

import {
  criarChaveRascunho,
  lerRascunho,
  limparRascunhosUsuario,
  salvarRascunho,
} from '../src/utils/draft-storage.js'

class MemoryStorage {
  getItem(chave) {
    return Object.hasOwn(this, chave)
      ? this[chave]
      : null
  }

  setItem(chave, valor) {
    this[chave] = String(valor)
  }

  removeItem(chave) {
    delete this[chave]
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

afterEach(() => {
  delete globalThis.localStorage
})

test('salva somente o valor recebido no rascunho escopado', () => {
  const chave = criarChaveRascunho(
    'professor-1',
    'redacao-1',
  )
  const valor = {
    score: '850',
    generalComment: 'Bom desenvolvimento.',
    criterionComments: {
      criterio1: 'Revisar a conclusão.',
    },
  }

  salvarRascunho(chave, valor)

  assert.deepEqual(lerRascunho(chave)?.valor, valor)
  assert.equal(
    globalThis.localStorage.getItem(chave).includes('textoRedacao'),
    false,
  )
})

test('logout remove somente rascunhos do usuário atual', () => {
  const chaveAtual = criarChaveRascunho(
    'professor-1',
    'redacao-1',
  )
  const chaveOutro = criarChaveRascunho(
    'professor-2',
    'redacao-2',
  )

  salvarRascunho(chaveAtual, { score: '900' })
  salvarRascunho(chaveOutro, { score: '700' })
  globalThis.localStorage.setItem(
    'lexis:preferencia:tema',
    'dark',
  )

  limparRascunhosUsuario('professor-1')

  assert.equal(lerRascunho(chaveAtual), null)
  assert.notEqual(lerRascunho(chaveOutro), null)
  assert.equal(
    globalThis.localStorage.getItem(
      'lexis:preferencia:tema',
    ),
    'dark',
  )
})
