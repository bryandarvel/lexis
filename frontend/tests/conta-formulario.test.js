import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapearErroDaConta,
  prepararNovoNome,
  prepararTrocaDeSenha,
  reiniciarCamposDaConta,
  respostaAindaVale,
  SENHA_VAZIA,
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

test('troca de senha exige senha atual e reusa a validação da recuperação', () => {
  assert.deepEqual(
    prepararTrocaDeSenha({ senhaAtual: 'Antiga123456', novaSenha: 'SenhaNova123', confirmacao: 'SenhaNova123' }),
    { dados: { senhaAtual: 'Antiga123456', novaSenha: 'SenhaNova123' }, erros: {} },
  )

  assert.match(
    prepararTrocaDeSenha({ senhaAtual: '', novaSenha: 'SenhaNova123', confirmacao: 'SenhaNova123' }).erros.senhaAtual,
    /senha atual/i,
  )
})

test('senha nova fraca, longa demais em bytes ou sem confirmação é recusada', () => {
  for (const nova of ['curta', 'senhasemnumero', 'somente12345', `Aa1${'é'.repeat(35)}`]) {
    const { dados, erros } = prepararTrocaDeSenha({ senhaAtual: 'Antiga123456', novaSenha: nova, confirmacao: nova })

    assert.equal(dados, null)
    assert.ok(erros.novaSenha)
  }

  const divergente = prepararTrocaDeSenha({
    senhaAtual: 'Antiga123456',
    novaSenha: 'SenhaNova123',
    confirmacao: 'SenhaNova124',
  })

  assert.equal(divergente.dados, null)
  assert.match(divergente.erros.confirmacao, /não coincidem/)
})

test('a senha nova não pode ser igual à atual', () => {
  const { dados, erros } = prepararTrocaDeSenha({
    senhaAtual: 'SenhaNova123',
    novaSenha: 'SenhaNova123',
    confirmacao: 'SenhaNova123',
  })

  assert.equal(dados, null)
  assert.match(erros.novaSenha, /diferente/)
})

// 422 CURRENT_PASSWORD_INVALID não é 401: não derruba a sessão nem repete.
test('senha atual incorreta vira erro no campo senhaAtual', () => {
  const resultado = mapearErroDaConta(
    erroApi(422, 'CURRENT_PASSWORD_INVALID', [{ field: 'senhaAtual', message: 'A senha atual está incorreta.' }]),
  )

  assert.deepEqual(resultado.campos, { senhaAtual: 'A senha atual está incorreta.' })
  assert.equal(resultado.mensagem, '')
  assert.equal(resultado.repetir, false)
})

test('erro de validação distribui as mensagens por campo', () => {
  const resultado = mapearErroDaConta(
    erroApi(422, 'VALIDATION_ERROR', [
      { field: 'nome', message: 'O nome é inválido.' },
      { field: 'novaSenha', message: 'A senha é fraca.' },
    ]),
  )

  assert.deepEqual(resultado.campos, { nome: 'O nome é inválido.', novaSenha: 'A senha é fraca.' })
})

test('limite de tentativas avisa sem reenviar', () => {
  const resultado = mapearErroDaConta(erroApi(429, 'RATE_LIMIT_EXCEEDED'))

  assert.match(resultado.mensagem, /tentativas/i)
  assert.equal(resultado.repetir, false)
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

// Revisão do PR #124: depois de reautenticar como outra pessoa, o formulário
// ficava com o nome e as senhas digitados por quem saiu.
const PROF_A = { id: 'prof-a', nome: 'Professor A' }
const PROF_B = { id: 'prof-b', nome: 'Professor B' }
const DIGITADO = {
  senhaAtual: 'atual-de-a',
  novaSenha: 'NovaDeA!2026',
  confirmacao: 'NovaDeA!2026',
}

test('trocar de conta apaga as senhas e repõe o nome de quem entrou', () => {
  const resultado = reiniciarCamposDaConta({
    contaDoFormulario: PROF_A.id,
    usuario: PROF_B,
    nome: 'Nome que A estava digitando',
    senha: DIGITADO,
  })

  assert.equal(resultado.trocou, true)
  assert.equal(resultado.nome, 'Professor B')
  assert.deepEqual(resultado.senha, SENHA_VAZIA)
  assert.equal(resultado.senha.senhaAtual, '')
  assert.equal(resultado.senha.novaSenha, '')
  assert.equal(resultado.senha.confirmacao, '')
})

test('reautenticar na mesma conta preserva o nome e as senhas digitados', () => {
  const resultado = reiniciarCamposDaConta({
    contaDoFormulario: PROF_A.id,
    usuario: PROF_A,
    nome: 'Nome em edição',
    senha: DIGITADO,
  })

  assert.equal(resultado.trocou, false)
  assert.equal(resultado.nome, 'Nome em edição')
  assert.deepEqual(resultado.senha, DIGITADO)
})

test('sair da conta também limpa os campos, sem herdar nome de ninguém', () => {
  const resultado = reiniciarCamposDaConta({
    contaDoFormulario: PROF_A.id,
    usuario: null,
    nome: 'Nome de A',
    senha: DIGITADO,
  })

  assert.equal(resultado.trocou, true)
  assert.equal(resultado.nome, '')
  assert.deepEqual(resultado.senha, SENHA_VAZIA)
})

test('a resposta pedida por A não vale para a sessão de B', () => {
  assert.equal(respostaAindaVale(PROF_A.id, PROF_B.id), false)
  assert.equal(respostaAindaVale(PROF_A.id, PROF_A.id), true)
  assert.equal(respostaAindaVale(PROF_A.id, undefined), false)
  assert.equal(respostaAindaVale(undefined, undefined), true)
})

test('o nome salvo por A não vira o nome de B: a troca já reiniciou o campo', () => {
  // Estado depois da troca, com a resposta de A ainda em voo.
  const depoisDaTroca = reiniciarCamposDaConta({
    contaDoFormulario: PROF_A.id,
    usuario: PROF_B,
    nome: 'Nome novo de A',
    senha: DIGITADO,
  })

  assert.equal(depoisDaTroca.nome, 'Professor B')
  // E a resposta de A é ignorada antes de chegar a atualizarSessao.
  assert.equal(respostaAindaVale(PROF_A.id, PROF_B.id), false)
})
