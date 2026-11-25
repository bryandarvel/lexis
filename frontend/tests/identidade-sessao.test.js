import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ehDaContaAtual,
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
  normalizarIdConta,
} from '../src/utils/identidade-sessao.js'

const INICIAL = { status: 'carregando', dados: null, usuarioId: null }

test('normaliza o id da conta e compara contas', () => {
  assert.equal(normalizarIdConta('aluno-a'), 'aluno-a')
  assert.equal(normalizarIdConta(''), null)
  assert.equal(normalizarIdConta(undefined), null)
  assert.equal(normalizarIdConta(42), null)
  assert.equal(mesmaConta('aluno-a', 'aluno-a'), true)
  assert.equal(mesmaConta('aluno-a', 'aluno-b'), false)
  assert.equal(mesmaConta(undefined, null), true)
})

test('o estado guarda a conta que o originou', () => {
  const estado = marcarConta({ status: 'pronto', dados: [1] }, 'aluno-a')

  assert.deepEqual(estado, { status: 'pronto', dados: [1], usuarioId: 'aluno-a' })
  assert.equal(ehDaContaAtual(estado, 'aluno-a'), true)
  assert.equal(ehDaContaAtual(estado, 'aluno-b'), false)
  assert.equal(ehDaContaAtual(undefined, 'aluno-a'), false)
})

// O caso relatado: A carrega, a sessão expira e B entra pelo diálogo.
test('ao trocar de conta, os dados de A não aparecem para B', () => {
  const deA = marcarConta({ status: 'pronto', dados: ['redação de A'] }, 'aluno-a')

  assert.deepEqual(estadoDaContaAtual(deA, 'aluno-b', INICIAL), INICIAL)
  assert.deepEqual(estadoDaContaAtual(deA, 'aluno-a', INICIAL), deA)
})

test('sem conta autenticada, nada de uma conta anterior é exibido', () => {
  const deA = marcarConta({ status: 'pronto', dados: ['redação de A'] }, 'aluno-a')

  assert.deepEqual(estadoDaContaAtual(deA, null, INICIAL), INICIAL)
  assert.deepEqual(estadoDaContaAtual(deA, undefined, INICIAL), INICIAL)
})

// Resposta pedida por A que chega depois de B entrar.
test('resposta atrasada da conta anterior é descartada', () => {
  const contaDaRequisicao = 'aluno-a'

  assert.equal(ehDaContaAtual({ usuarioId: contaDaRequisicao }, 'aluno-b'), false)
  assert.equal(ehDaContaAtual({ usuarioId: contaDaRequisicao }, 'aluno-a'), true)
})

test('reautenticar na mesma conta preserva o que já estava carregado', () => {
  const estado = marcarConta({ status: 'pronto', dados: ['r1'] }, 'aluno-a')

  assert.deepEqual(estadoDaContaAtual(estado, 'aluno-a', INICIAL), estado)
  assert.equal(estadoDaContaAtual(estado, 'aluno-a', INICIAL).dados[0], 'r1')
})
