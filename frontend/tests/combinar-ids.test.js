import test from 'node:test'
import assert from 'node:assert/strict'
import { combinarIds } from '../src/utils/combinar-ids.js'

test('une ids sem repetir e sem espaços sobrando', () => {
  assert.equal(combinarIds('a b', 'b', undefined, '  c  '), 'a b c')
})

test('sem ids devolve texto vazio', () => {
  assert.equal(combinarIds(), '')
  assert.equal(combinarIds(undefined, null, ''), '')
})
