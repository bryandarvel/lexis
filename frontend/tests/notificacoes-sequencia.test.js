import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aplicarConsulta,
  aplicarFalhaDaConsulta,
  aplicarLeitura,
  avancarGeracao,
  contarNaoLidas,
  geracaoDe,
  iniciarConsulta,
  respostaVigente,
} from '../src/utils/notificacoes-sequencia.js'
import {
  estadoDaContaAtual,
  marcarConta,
} from '../src/utils/identidade-sessao.js'

const aviso = (id, lida = false) => ({
  id,
  tipo: 'REDACAO_ENVIADA',
  titulo: 'Aviso ' + id,
  mensagem: 'Mensagem fictícia.',
  lidaEm: lida ? '2026-11-11T12:00:00Z' : null,
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

const comDois = () => ({
  ...INICIAL,
  status: 'pronto',
  notificacoes: [aviso('n1'), aviso('n2')],
  totalNaoLidas: 2,
})

// Corrida relatada na revisão dos PRs #123 e #134: a consulta começa com 2 não lidas, a pessoa
// marca 1 como lida (lista e contador em 1) e a resposta ANTIGA chega com 2, desfazendo a leitura.
test('a consulta que começou antes da leitura não desfaz a leitura', () => {
  let estado = comDois()

  // 1. a consulta começa; o servidor ainda vai responder com as 2 não lidas de antes
  const consulta = iniciarConsulta(estado)
  estado = consulta.estado
  const respostaAntiga = { notificacoes: [aviso('n1'), aviso('n2')], totalNaoLidas: 2 }

  // 2. a leitura local acontece primeiro
  estado = aplicarLeitura(estado, aviso('n1', true))
  assert.equal(estado.totalNaoLidas, 1)

  // 3. a resposta antiga chega: precisa ser descartada
  estado = aplicarConsulta(estado, respostaAntiga, consulta.geracao)

  assert.equal(estado.totalNaoLidas, 1, 'o contador não pode voltar para 2')
  assert.equal(contarNaoLidas(estado.notificacoes), 1, 'a lista precisa concordar com o contador')
  assert.equal(estado.notificacoes.find((n) => n.id === 'n1').lidaEm !== null, true)
})

test('a falha de uma consulta antiga não apaga o que já está na tela', () => {
  let estado = comDois()
  const consulta = iniciarConsulta(estado)
  estado = aplicarLeitura(consulta.estado, aviso('n1', true))

  estado = aplicarFalhaDaConsulta(estado, 'Não foi possível carregar.', consulta.geracao)

  assert.equal(estado.status, 'pronto')
  assert.equal(estado.mensagem, '')
  assert.equal(estado.totalNaoLidas, 1)
})

test('a resposta da consulta vigente é aplicada e a contagem sai da lista', () => {
  const consulta = iniciarConsulta(INICIAL)
  const estado = aplicarConsulta(
    consulta.estado,
    { notificacoes: [aviso('n1'), aviso('n2', true), aviso('n3')], totalNaoLidas: 99 },
    consulta.geracao,
  )

  assert.equal(estado.status, 'pronto')
  assert.equal(estado.notificacoes.length, 3)
  // 99 veio do servidor, mas a lista manda: o contador nunca diverge dela.
  assert.equal(estado.totalNaoLidas, 2)
})

test('a falha da consulta vigente aparece na tela', () => {
  const consulta = iniciarConsulta(INICIAL)
  const estado = aplicarFalhaDaConsulta(
    consulta.estado,
    'Não foi possível carregar seus avisos.',
    consulta.geracao,
  )

  assert.equal(estado.status, 'erro')
  assert.equal(estado.mensagem, 'Não foi possível carregar seus avisos.')
})

test('uma consulta mais nova descarta a resposta da anterior', () => {
  const primeira = iniciarConsulta(comDois())
  const segunda = iniciarConsulta(primeira.estado)

  const comAtrasada = aplicarConsulta(
    segunda.estado,
    { notificacoes: [aviso('velho')], totalNaoLidas: 1 },
    primeira.geracao,
  )
  assert.deepEqual(comAtrasada.notificacoes, segunda.estado.notificacoes)

  const comNova = aplicarConsulta(
    segunda.estado,
    { notificacoes: [aviso('novo')], totalNaoLidas: 1 },
    segunda.geracao,
  )
  assert.equal(comNova.notificacoes[0].id, 'novo')
})

test('ler os avisos um a um leva a contagem de 2 para 1 e para 0, sempre pela lista', () => {
  let estado = comDois()

  estado = aplicarLeitura(estado, aviso('n1', true))
  assert.equal(estado.totalNaoLidas, 1)
  assert.equal(contarNaoLidas(estado.notificacoes), 1)
  assert.equal(estado.processandoId, null)

  estado = aplicarLeitura(estado, aviso('n2', true))
  assert.equal(estado.totalNaoLidas, 0)
  assert.equal(contarNaoLidas(estado.notificacoes), 0)
})

test('marcar como lido algo já lido não decrementa de novo', () => {
  const estado = aplicarLeitura(comDois(), aviso('n1', true))

  assert.equal(aplicarLeitura(estado, aviso('n1', true)).totalNaoLidas, 1)
})

test('um aviso fora da lista não altera a contagem', () => {
  assert.equal(aplicarLeitura(comDois(), aviso('outro', true)).totalNaoLidas, 2)
})

test('cada leitura e cada consulta avançam a geração', () => {
  assert.equal(geracaoDe(INICIAL), 0)
  assert.equal(geracaoDe({}), 0)
  assert.equal(geracaoDe(undefined), 0)
  assert.equal(geracaoDe(avancarGeracao(INICIAL)), 1)
  assert.equal(geracaoDe(aplicarLeitura(comDois(), aviso('n1', true))), 1)
  assert.equal(respostaVigente(INICIAL, 0), true)
  assert.equal(respostaVigente(INICIAL, 1), false)
})

// A geração não substitui o isolamento por conta: as duas barreiras valem juntas.
test('na troca de conta a lista e a contagem somem, mesmo com a geração vigente', () => {
  const consulta = iniciarConsulta(marcarConta(comDois(), 'conta-a'))
  const deA = marcarConta(
    aplicarConsulta(consulta.estado, { notificacoes: [aviso('n1'), aviso('n2')] }, consulta.geracao),
    'conta-a',
  )

  assert.equal(estadoDaContaAtual(deA, 'conta-a', INICIAL).totalNaoLidas, 2)
  const paraB = estadoDaContaAtual(deA, 'conta-b', INICIAL)
  assert.equal(paraB.totalNaoLidas, 0)
  assert.deepEqual(paraB.notificacoes, [])
  assert.equal(paraB.status, 'carregando')
})

test('a leitura preserva a conta dona do estado', () => {
  const deA = aplicarLeitura(marcarConta(comDois(), 'conta-a'), aviso('n1', true))

  assert.equal(deA.usuarioId, 'conta-a')
  assert.equal(estadoDaContaAtual(deA, 'conta-b', INICIAL).totalNaoLidas, 0)
})

test('contarNaoLidas aceita entrada inesperada sem quebrar', () => {
  assert.equal(contarNaoLidas(undefined), 0)
  assert.equal(contarNaoLidas(null), 0)
  assert.equal(contarNaoLidas([]), 0)
  assert.equal(contarNaoLidas([aviso('a'), aviso('b', true)]), 1)
})
