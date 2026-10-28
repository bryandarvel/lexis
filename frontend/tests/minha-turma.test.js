import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  descreverMatricula,
  formatarDataEntrada,
  indicaSemMatricula,
  listarPendenciasDaSaida,
  mensagemErroMinhaTurma,
  mensagemSaidaDaTurma,
  obterCodigoErroApi,
} from '../src/utils/minha-turma.js'

function erroApi(status, code, message = 'Mensagem da API.') {
  return { response: { status, data: { error: { code, message } } } }
}

function redacao(id, status, turmaId, enunciado) {
  return { id, status, tema: { enunciado, turma: { id: turmaId } } }
}

test('descreve a matrícula com turma, professor e data de entrada', () => {
  const descricao = descreverMatricula({
    iniciadaEm: new Date(2026, 9, 5, 14, 30).toISOString(),
    turma: {
      id: 't1',
      nome: ' 3º A ',
      ativa: true,
      professor: { nome: 'Helena Demo' },
    },
  })

  assert.deepEqual(descricao, {
    turmaId: 't1',
    turma: '3º A',
    professor: 'Helena Demo',
    desde: '05/10/2026',
    podeSair: true,
  })
})

test('não oferece a saída de turma arquivada e tolera dados ausentes', () => {
  assert.equal(
    descreverMatricula({ turma: { id: 't1', nome: 'A', ativa: false } }).podeSair,
    false,
  )
  assert.equal(descreverMatricula(null), null)
  assert.equal(descreverMatricula({}), null)
  assert.equal(
    descreverMatricula({ turma: { id: 't1' } }).professor,
    null,
  )
  assert.equal(formatarDataEntrada('inválida'), null)
  assert.equal(formatarDataEntrada(undefined), null)
})

test('lista só os rascunhos e as enviadas da turma que o aluno deixa', () => {
  const pendencias = listarPendenciasDaSaida(
    [
      redacao('r1', 'RASCUNHO', 't1', 'Mobilidade urbana'),
      redacao('r2', 'ENVIADA', 't1', 'Bibliotecas públicas'),
      redacao('r3', 'AVALIADA', 't1', 'Inclusão digital'),
      redacao('r4', 'RASCUNHO', 't2', 'Outra turma'),
      redacao('r5', 'RASCUNHO', 't1', 'Água potável'),
    ],
    't1',
  )

  assert.deepEqual(
    pendencias.rascunhos.map(({ id, enunciado }) => [id, enunciado]),
    [
      ['r5', 'Água potável'],
      ['r1', 'Mobilidade urbana'],
    ],
  )
  assert.deepEqual(
    pendencias.aguardandoCorrecao.map(({ id }) => id),
    ['r2'],
  )
})

test('sem turma ou sem redações, não há pendências', () => {
  assert.deepEqual(listarPendenciasDaSaida(null, 't1'), {
    rascunhos: [],
    aguardandoCorrecao: [],
  })
  assert.deepEqual(
    listarPendenciasDaSaida([redacao('r1', 'RASCUNHO', 't1', 'A')], null),
    { rascunhos: [], aguardandoCorrecao: [] },
  )
})

test('lê o código do erro e reconhece a falta de matrícula ativa', () => {
  assert.equal(obterCodigoErroApi(erroApi(404, 'ACTIVE_ENROLLMENT_NOT_FOUND')), 'ACTIVE_ENROLLMENT_NOT_FOUND')
  assert.equal(obterCodigoErroApi(new Error('Network Error')), null)
  assert.equal(indicaSemMatricula(erroApi(404, 'ACTIVE_ENROLLMENT_NOT_FOUND')), true)
  assert.equal(indicaSemMatricula(erroApi(409, 'ACTIVE_ENROLLMENT_NOT_FOUND')), false)
  assert.equal(indicaSemMatricula(erroApi(404, 'CLASS_NOT_FOUND')), false)
})

test('confirma a saída com o nome da turma quando disponível', () => {
  assert.equal(
    mensagemSaidaDaTurma(' 3º A '),
    'Você saiu da turma 3º A. Para entrar em outra, use o código de acesso abaixo.',
  )
  assert.equal(
    mensagemSaidaDaTurma(null),
    'Você saiu da turma. Para entrar em outra, use o código de acesso abaixo.',
  )
})

test('traduz os erros da turma em mensagens claras', () => {
  assert.match(mensagemErroMinhaTurma(new Error('Network Error')), /conectar ao servidor/)
  assert.match(
    mensagemErroMinhaTurma(erroApi(404, 'ACTIVE_ENROLLMENT_NOT_FOUND')),
    /não está mais matriculado/,
  )
  assert.match(
    mensagemErroMinhaTurma(erroApi(404, 'CLASS_ACCESS_CODE_INVALID')),
    /arquivada/,
  )
  assert.equal(
    mensagemErroMinhaTurma(erroApi(500, 'INTERNAL_ERROR', 'Erro interno.')),
    'Erro interno.',
  )
  assert.equal(
    mensagemErroMinhaTurma({ response: { status: 500 } }),
    'Não foi possível concluir a ação. Tente novamente.',
  )
})
