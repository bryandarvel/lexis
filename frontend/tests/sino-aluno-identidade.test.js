import assert from 'node:assert/strict'
import test from 'node:test'

import {
  estadoDaContaAtual,
  marcarConta,
} from '../src/utils/identidade-sessao.js'

// Sino de notificações do aluno (AlunoLayout + useNotificacoesNaoLidas). O hook guarda a contagem com o
// id de quem a carregou e, no render, só mostra a contagem da conta autenticada agora. O efeito do hook
// depende do id, então uma conta nova dispara nova consulta (conferido no navegador com API fictícia).
const INICIAL = { totalNaoLidas: 0, usuarioId: null }
const doSino = (total, usuarioId) => marcarConta({ totalNaoLidas: total }, usuarioId)
const mostrada = (estado, usuarioId) => estadoDaContaAtual(estado, usuarioId, INICIAL).totalNaoLidas

test('ao trocar de A para B o sino deixa de mostrar a contagem de A', () => {
  const deA = doSino(3, 'aluno-a')

  assert.equal(mostrada(deA, 'aluno-a'), 3)
  // B ainda não carregou: zera na hora, em vez de herdar o 3 de A.
  assert.equal(mostrada(deA, 'aluno-b'), 0)
})

test('depois da consulta de B, o sino mostra a contagem de B', () => {
  assert.equal(mostrada(doSino(1, 'aluno-b'), 'aluno-b'), 1)
})

test('reautenticar na mesma conta preserva a contagem', () => {
  const deA = doSino(3, 'aluno-a')

  assert.equal(mostrada(deA, 'aluno-a'), 3)
})

test('sem conta autenticada (logout) a contagem zera', () => {
  const deA = doSino(3, 'aluno-a')

  assert.equal(mostrada(deA, null), 0)
  assert.equal(mostrada(deA, undefined), 0)
})

test('resposta atrasada de A não aparece depois da entrada de B', () => {
  // A resposta de A que chega depois da troca grava a contagem marcada com A...
  const respostaAtrasadaDeA = doSino(3, 'aluno-a')

  // ...e o render de B a ignora.
  assert.equal(mostrada(respostaAtrasadaDeA, 'aluno-b'), 0)
})
