import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validarBancoLocalEmail, resumirContagensEmail } from '../../src/utils/email-operation.js'

test('consulta operacional aceita somente os dois bancos locais e recusa produção', () => {
  assert.equal(validarBancoLocalEmail({ ambiente: 'test', url: 'mysql://ficticio:senha@127.0.0.1:3307/lexis_test' }), 'lexis_test')
  assert.equal(validarBancoLocalEmail({ ambiente: 'development', url: 'mysql://localhost/lexis' }), 'lexis')
  assert.equal(validarBancoLocalEmail({ ambiente: 'test', url: 'mysql://[::1]/lexis_test' }), 'lexis_test')
  for (const [ambiente, url] of [
    ['production', 'mysql://localhost/lexis'],
    ['test', 'mysql://remoto.example.com/lexis_test'],
    ['test', 'mysql://localhost/banco_real'],
    ['test', 'https://localhost/lexis'],
    ['test', 'nao-e-url'],
  ]) assert.throws(() => validarBancoLocalEmail({ ambiente, url }))
})

test('resumo conserva somente estados e contagens, sem dados sensíveis', () => {
  const resumo = resumirContagensEmail([
    { statusEmail: 'PENDENTE', _count: { _all: 2 }, email: 'ficticio@example.com', tokenHash: 'nao-incluir' },
    { statusEmail: 'ERRO', _count: { _all: 1 }, mensagem: 'nao-incluir' },
  ])
  assert.deepEqual(resumo, { PENDENTE: 2, ENVIANDO: 0, ENVIADO: 0, ERRO: 1 })
  assert.doesNotMatch(JSON.stringify(resumo), /ficticio|token|nao-incluir/)
  assert.deepEqual(resumirContagensEmail([]), { PENDENTE: 0, ENVIANDO: 0, ENVIADO: 0, ERRO: 0 })
})

test('contagens inválidas não são silenciosamente apresentadas como sucesso', () => {
  for (const grupo of [
    { statusEmail: 'DESCONHECIDO', _count: { _all: 1 } },
    { statusEmail: 'ERRO', _count: { _all: -1 } },
    { statusEmail: 'ERRO', _count: { _all: '2' } },
  ]) assert.throws(() => resumirContagensEmail([grupo]))
})
