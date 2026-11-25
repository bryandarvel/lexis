import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aplicarConsulta,
  aplicarFalhaDaConsulta,
  aplicarLeitura,
  contarNaoLidas,
  iniciarConsulta,
  respostaVigente,
} from '../src/utils/notificacoes-sequencia.js'
import {
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
} from '../src/utils/identidade-sessao.js'

// Central de notificações do aluno (/aluno/notificacoes). As regras são as mesmas da central do
// professor: a lista e o contador saem da mesma fonte, a resposta de uma consulta vencida é
// descartada, e nada de uma conta aparece ou altera a tela de outra.
const aviso = (id, lida = false) => ({
  id,
  tipo: 'FEEDBACK_PUBLICADO',
  titulo: 'Correção publicada',
  mensagem: 'Sua correção foi publicada.',
  lidaEm: lida ? '2026-11-11T12:00:00Z' : null,
  feedbackVersao: { numero: 1, feedback: { redacaoId: 'r-' + id } },
})

const INICIAL = {
  usuarioId: null,
  geracao: 0,
  status: 'carregando',
  notificacoes: [],
  totalNaoLidas: 0,
  processandoId: null,
  mensagem: '',
}

const carregadoPara = (usuarioId, ...avisos) => {
  const consulta = iniciarConsulta(marcarConta(INICIAL, usuarioId))

  return marcarConta(
    aplicarConsulta(consulta.estado, { notificacoes: avisos }, consulta.geracao),
    usuarioId,
  )
}

test('ao trocar de A para B, a lista e o contador de A somem na hora', () => {
  const deA = carregadoPara('aluno-a', aviso('a1'), aviso('a2'))

  assert.equal(estadoDaContaAtual(deA, 'aluno-a', INICIAL).totalNaoLidas, 2)

  const paraB = estadoDaContaAtual(deA, 'aluno-b', INICIAL)

  assert.deepEqual(paraB.notificacoes, [])
  assert.equal(paraB.totalNaoLidas, 0)
  assert.equal(paraB.status, 'carregando')
  assert.equal(paraB.mensagem, '')
})

test('a consulta pendente de A não preenche a tela de B', () => {
  // A consulta de A está em voo quando B entra: a resposta é rejeitada pela conta.
  const consultaDeA = iniciarConsulta(marcarConta(INICIAL, 'aluno-a'))
  const respostaDeA = { notificacoes: [aviso('a1'), aviso('a2')] }

  assert.equal(mesmaConta('aluno-a', 'aluno-b'), false)

  const seFosseAplicada = marcarConta(
    aplicarConsulta(consultaDeA.estado, respostaDeA, consultaDeA.geracao),
    'aluno-a',
  )

  assert.equal(estadoDaContaAtual(seFosseAplicada, 'aluno-b', INICIAL).totalNaoLidas, 0)
  assert.deepEqual(estadoDaContaAtual(seFosseAplicada, 'aluno-b', INICIAL).notificacoes, [])
})

test('a ação de leitura pendente de A não altera a lista nem o contador de B', () => {
  const deA = carregadoPara('aluno-a', aviso('a1'), aviso('a2'))
  const deB = carregadoPara('aluno-b', aviso('b1'))

  // A resposta da leitura pedida por A chega depois de B entrar.
  const leituraDeA = marcarConta(aplicarLeitura(deA, aviso('a1', true)), 'aluno-a')

  assert.equal(mesmaConta('aluno-a', 'aluno-b'), false)
  assert.equal(estadoDaContaAtual(leituraDeA, 'aluno-b', INICIAL).totalNaoLidas, 0)
  // O estado de B continua intacto.
  assert.equal(estadoDaContaAtual(deB, 'aluno-b', INICIAL).totalNaoLidas, 1)
  assert.equal(estadoDaContaAtual(deB, 'aluno-b', INICIAL).notificacoes[0].id, 'b1')
})

test('reautenticar na mesma conta preserva a lista e o contador', () => {
  const deA = carregadoPara('aluno-a', aviso('a1'), aviso('a2', true))
  const visivel = estadoDaContaAtual(deA, 'aluno-a', INICIAL)

  assert.equal(visivel.totalNaoLidas, 1)
  assert.equal(visivel.notificacoes.length, 2)
  assert.equal(visivel.status, 'pronto')
})

// A mesma corrida do item 1, agora na central do aluno.
test('a consulta que começou antes da leitura não desfaz a leitura', () => {
  let estado = carregadoPara('aluno-a', aviso('a1'), aviso('a2'))

  const consulta = iniciarConsulta(estado)
  estado = consulta.estado
  const respostaAntiga = { notificacoes: [aviso('a1'), aviso('a2')] }

  estado = aplicarLeitura(estado, aviso('a1', true))
  assert.equal(estado.totalNaoLidas, 1)

  estado = aplicarConsulta(estado, respostaAntiga, consulta.geracao)

  assert.equal(estado.totalNaoLidas, 1, 'o contador não pode voltar para 2')
  assert.equal(contarNaoLidas(estado.notificacoes), 1)
  assert.equal(respostaVigente(estado, consulta.geracao), false)
})

test('a falha de uma consulta vencida não apaga a lista do aluno', () => {
  const consulta = iniciarConsulta(carregadoPara('aluno-a', aviso('a1'), aviso('a2')))
  const estado = aplicarLeitura(consulta.estado, aviso('a1', true))

  const depois = aplicarFalhaDaConsulta(
    estado,
    'Não foi possível carregar suas notificações.',
    consulta.geracao,
  )

  assert.equal(depois.status, 'pronto')
  assert.equal(depois.mensagem, '')
  assert.equal(depois.totalNaoLidas, 1)
})

test('o contador do aluno sai da lista, não do número que o servidor mandou', () => {
  const consulta = iniciarConsulta(marcarConta(INICIAL, 'aluno-a'))
  const estado = aplicarConsulta(
    consulta.estado,
    { notificacoes: [aviso('a1'), aviso('a2', true)], totalNaoLidas: 42 },
    consulta.geracao,
  )

  assert.equal(estado.totalNaoLidas, 1)
})
