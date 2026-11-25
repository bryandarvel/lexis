import assert from 'node:assert/strict'
import test from 'node:test'
import { obterTokenRecuperacao, validarNovaSenha } from '../src/utils/password-recovery.js'

test('aceita somente token hexadecimal completo do fragmento', () => {
  assert.equal(obterTokenRecuperacao(`#token=${'a'.repeat(64)}`), 'a'.repeat(64))
  for (const fragmento of ['', '#token=curto', '#token=<script>', `#token=${'z'.repeat(64)}`]) assert.equal(obterTokenRecuperacao(fragmento), '')
})

test('valida confirmação, complexidade e limite em bytes da nova senha', () => {
  assert.equal(validarNovaSenha('SenhaNova123', 'SenhaNova123'), '')
  assert.match(validarNovaSenha('SenhaNova123', 'OutraSenha123'), /não coincidem/)
  for (const senha of ['curta', 'senhasemnumero', 'somente12345', `Aa1${'é'.repeat(35)}`]) assert.notEqual(validarNovaSenha(senha, senha), '')
})
