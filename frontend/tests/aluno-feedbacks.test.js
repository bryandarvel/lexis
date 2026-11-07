import assert from 'node:assert/strict'
import test from 'node:test'

import {
  caminhoDoFeedback,
  descreverQuantidade,
  formatarPublicacao,
  ordenarFeedbacks,
  resumirFeedbacks,
  selecionarFeedbacks,
  temFeedbackPublicado,
} from '../src/utils/aluno-feedbacks.js'

const redacao = (id, extra = {}) => ({
  id,
  status: 'AVALIADA',
  notaPublicada: 700,
  publicadoEm: '2026-03-10T12:00:00.000Z',
  ...extra,
})

test('só entra quem está avaliada, com id e nota publicada', () => {
  const lista = [
    redacao('a'),
    redacao('b', { status: 'ENVIADA', notaPublicada: null }),
    redacao('c', { status: 'RASCUNHO', notaPublicada: null }),
    redacao('d', { notaPublicada: null }),
    redacao('e', { notaPublicada: 0 }),
    redacao(undefined),
  ]

  assert.deepEqual(
    selecionarFeedbacks(lista).map((item) => item.id),
    ['a', 'e'],
  )
  assert.equal(temFeedbackPublicado(null), false)
  assert.deepEqual(selecionarFeedbacks(undefined), [])
})

test('ordena por data de publicação, mais recente primeiro por padrão', () => {
  const lista = [
    redacao('antiga', { publicadoEm: '2026-01-01T00:00:00.000Z' }),
    redacao('nova', { publicadoEm: '2026-05-01T00:00:00.000Z' }),
    redacao('meio', { publicadoEm: '2026-03-01T00:00:00.000Z' }),
  ]

  assert.deepEqual(
    ordenarFeedbacks(lista).map((item) => item.id),
    ['nova', 'meio', 'antiga'],
  )
  assert.deepEqual(
    ordenarFeedbacks(lista, 'antigas').map((item) => item.id),
    ['antiga', 'meio', 'nova'],
  )
})

test('ordena por nota e desempata pela publicação mais recente', () => {
  const lista = [
    redacao('a', { notaPublicada: 600 }),
    redacao('b', {
      notaPublicada: 800,
      publicadoEm: '2026-01-01T00:00:00.000Z',
    }),
    redacao('c', {
      notaPublicada: 800,
      publicadoEm: '2026-04-01T00:00:00.000Z',
    }),
  ]

  assert.deepEqual(
    ordenarFeedbacks(lista, 'maior-nota').map((item) => item.id),
    ['c', 'b', 'a'],
  )
  assert.deepEqual(
    ordenarFeedbacks(lista, 'menor-nota').map((item) => item.id),
    ['a', 'c', 'b'],
  )
})

test('ordenar não altera a lista original e aceita entrada inválida', () => {
  const lista = [
    redacao('a', { publicadoEm: '2026-01-01T00:00:00.000Z' }),
    redacao('b', { publicadoEm: '2026-02-01T00:00:00.000Z' }),
  ]

  ordenarFeedbacks(lista)

  assert.deepEqual(lista.map((item) => item.id), ['a', 'b'])
  assert.deepEqual(ordenarFeedbacks(null), [])
})

test('data de publicação ausente ou inválida vai para o fim', () => {
  const lista = [
    redacao('sem', { publicadoEm: null }),
    redacao('ok'),
    redacao('ruim', { publicadoEm: 'não é data' }),
  ]

  assert.equal(ordenarFeedbacks(lista)[0].id, 'ok')
})

test('resume quantidade e média arredondada das notas publicadas', () => {
  assert.deepEqual(resumirFeedbacks([]), { quantidade: 0, media: null })
  assert.deepEqual(resumirFeedbacks(undefined), {
    quantidade: 0,
    media: null,
  })
  assert.deepEqual(
    resumirFeedbacks([
      redacao('a', { notaPublicada: 740 }),
      redacao('b', { notaPublicada: 601 }),
    ]),
    { quantidade: 2, media: 671 },
  )
  assert.equal(
    resumirFeedbacks([redacao('a', { notaPublicada: 0 })]).media,
    0,
  )
})

test('descreve a quantidade no singular e no plural', () => {
  assert.equal(descreverQuantidade(0), 'Nenhum feedback publicado.')
  assert.equal(descreverQuantidade(1), '1 feedback publicado.')
  assert.equal(descreverQuantidade(3), '3 feedbacks publicados.')
})

test('formata a data de publicação e devolve null sem data válida', () => {
  assert.match(
    formatarPublicacao(redacao('a')),
    /^Publicado em \d{2}\/\d{2}\/\d{4}$/,
  )
  assert.equal(formatarPublicacao(redacao('a', { publicadoEm: null })), null)
  assert.equal(formatarPublicacao(undefined), null)
})

test('monta o caminho do feedback com o id codificado', () => {
  assert.equal(
    caminhoDoFeedback({ id: 'abc/1' }),
    '/aluno/redacoes/abc%2F1/feedback',
  )
})
