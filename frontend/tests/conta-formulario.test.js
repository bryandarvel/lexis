import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapearErroDaConta,
  prepararNovoNome,
} from '../src/utils/conta-formulario.js'

const erroApi = (status, code, details) => ({
  response: { status, data: { error: { code, message: 'mensagem do servidor', details } } },
})

test('nome válido é aparado e tem espaços colapsados', () => {
  assert.deepEqual(prepararNovoNome('  Professora   Fictícia  ', 'Antigo'), {
    nome: 'Professora Fictícia',
    erro: '',
  })
})

test('nome fora dos limites do backend é recusado antes do envio', () => {
  assert.match(prepararNovoNome('A', 'Antigo').erro, /2 a 120/)
  assert.match(prepararNovoNome('   ', 'Antigo').erro, /2 a 120/)
  assert.match(prepararNovoNome('a'.repeat(121), 'Antigo').erro, /2 a 120/)
  assert.equal(prepararNovoNome('a'.repeat(120), 'Antigo').erro, '')
  assert.equal(prepararNovoNome(undefined, 'Antigo').nome, null)
})

test('nome igual ao atual não gera requisição', () => {
  const resultado = prepararNovoNome('Professora Fictícia', 'Professora Fictícia')

  assert.equal(resultado.nome, null)
  assert.match(resultado.erro, /Altere/)
})

// 422 CURRENT_PASSWORD_INVALID não é 401: não derruba a sessão nem repete.
test('senha atual incorreta vira erro no campo senhaAtual', () => {
  const resultado = mapearErroDaConta(
    erroApi(422, 'CURRENT_PASSWORD_INVALID', [{ field: 'senhaAtual', message: 'A senha atual está incorreta.' }]),
  )

  assert.deepEqual(resultado.campos, { senhaAtual: 'A senha atual está incorreta.' })
  assert.equal(resultado.mensagem, '')
})

test('erro de validação distribui as mensagens por campo', () => {
  const resultado = mapearErroDaConta(
    erroApi(422, 'VALIDATION_ERROR', [
      { field: 'nome', message: 'O nome é inválido.' },
      { field: 'novoEmail', message: 'E-mail inválido.' },
    ]),
  )

  assert.deepEqual(resultado.campos, { nome: 'O nome é inválido.', novoEmail: 'E-mail inválido.' })
})

test('limite de tentativas avisa sem reenviar', () => {
  const resultado = mapearErroDaConta(erroApi(429, 'RATE_LIMIT_EXCEEDED'))

  assert.match(resultado.mensagem, /tentativas/i)
  assert.deepEqual(resultado.campos, {})
})

test('401 fica para o tratamento de sessão, sem mensagem na página', () => {
  const resultado = mapearErroDaConta(erroApi(401, 'AUTHENTICATION_REQUIRED'))

  assert.equal(resultado.sessaoExpirada, true)
  assert.equal(resultado.mensagem, '')
})

test('sem resposta do servidor, a mensagem fala de conexão', () => {
  const resultado = mapearErroDaConta(new Error('falha de rede'))

  assert.match(resultado.mensagem, /conex/i)
  assert.equal(resultado.sessaoExpirada, false)
})

test('e-mail em uso ou igual ao atual aponta para o campo de novo endereço', () => {
  const conflitos = [[409, 'EMAIL_ALREADY_IN_USE'], [422, 'EMAIL_UNCHANGED']]
  for (const [status, codigo] of conflitos) {
    const resultado = mapearErroDaConta(erroApi(status, codigo))
    assert.deepEqual(resultado.campos, { novoEmail: 'mensagem do servidor' })
    assert.equal(resultado.mensagem, '')
  }
})
