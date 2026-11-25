import assert from 'node:assert/strict'
import test from 'node:test'

import { deveDescartarRevisaoOcr } from '../src/utils/sessao-ocr.js'

// O diálogo de reautenticação tem e-mail editável: outra conta pode entrar sem
// logout. A revisão de OCR da conta anterior não pode ficar na memória.
test('troca efetiva de conta descarta a revisão', () => {
  assert.equal(deveDescartarRevisaoOcr('aluno-a', 'aluno-b'), true)
})

test('reautenticar na mesma conta preserva a revisão', () => {
  assert.equal(deveDescartarRevisaoOcr('aluno-a', 'aluno-a'), false)
})

test('primeiro login não descarta, porque não há conta anterior', () => {
  for (const anterior of [null, undefined, '']) {
    assert.equal(deveDescartarRevisaoOcr(anterior, 'aluno-a'), false)
  }
})

test('id novo ausente não descarta: nada indica troca de conta', () => {
  for (const novo of [null, undefined, '']) {
    assert.equal(deveDescartarRevisaoOcr('aluno-a', novo), false)
  }
})

test('valores não textuais não são tratados como conta', () => {
  assert.equal(deveDescartarRevisaoOcr(42, 'aluno-a'), false)
  assert.equal(deveDescartarRevisaoOcr('aluno-a', 42), false)
  assert.equal(deveDescartarRevisaoOcr(undefined, undefined), false)
})
