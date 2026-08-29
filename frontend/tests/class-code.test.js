import assert from 'node:assert/strict'
import { test } from 'node:test'

import { normalizarCodigoAcesso } from '../src/utils/class-code.js'

test('normaliza minúsculas e espaços do código da turma', () => {
  assert.equal(
    normalizarCodigoAcesso('  lex 3a 2k  '),
    'LEX3A2K',
  )
})

test('não remove caracteres inválidos durante a normalização', () => {
  assert.equal(
    normalizarCodigoAcesso('lex-3a2k'),
    'LEX-3A2K',
  )
})
