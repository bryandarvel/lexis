import assert from 'node:assert/strict'
import test from 'node:test'

import { MENSAGEM_REAUTENTICACAO } from '../src/utils/reautenticacao.js'

// O diálogo é compartilhado e aparece também para o aluno, por exemplo na
// revisão do OCR, onde não existe correção do professor nem salvamento local.
test('a mensagem não fala em correção nem em salvamento local', () => {
  assert.doesNotMatch(MENSAGEM_REAUTENTICACAO, /corre[çc][ãa]o/i)
  assert.doesNotMatch(MENSAGEM_REAUTENTICACAO, /salv[ao]/i)
  assert.doesNotMatch(MENSAGEM_REAUTENTICACAO, /localmente/i)
})

test('a mensagem continua pedindo o login e mantendo a promessa de preservar a tela', () => {
  assert.match(MENSAGEM_REAUTENTICACAO, /Entre novamente para continuar/)
  assert.match(MENSAGEM_REAUTENTICACAO, /esta tela será preservada/i)
})

test('a mensagem não é específica de um papel', () => {
  assert.doesNotMatch(MENSAGEM_REAUTENTICACAO, /professor|aluno|redação|turma/i)
})
