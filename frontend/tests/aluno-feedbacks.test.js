import assert from 'node:assert/strict'
import test from 'node:test'

import {
  caminhoDoFeedback,
  descreverQuantidade,
  formatarPublicacao,
  obterProfessorDoFeedback,
  ordenarFeedbacks,
  resumirFeedbacks,
  selecionarFeedbacks,
  temFeedbackPublicado,
} from '../src/utils/aluno-feedbacks.js'
import { formatarIndicador } from '../src/utils/aluno-painel.js'

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

// Revisão do PR #84: o resumo precisa bater com o Painel. O backend (desempenho.service.js) arredonda a
// média para 1 casa e o Painel arredonda esse valor para inteiro (formatarIndicador). Arredondar a média
// crua direto para inteiro diverge nos casos x,45 a x,49: 832,49 virava 832 aqui e 833 no Painel.
const notas = (...valores) => valores.map((nota, i) => redacao('r' + i, { notaPublicada: nota }))
const comoOPainel = (mediaGeralDoBackend) => formatarIndicador(mediaGeralDoBackend)
const mediaDoBackend = (lista) => Math.round((lista.reduce((t, r) => t + r.notaPublicada, 0) / lista.length) * 10) / 10

test('média x,5 exata arredonda para cima, igual ao Painel', () => {
  const lista = notas(800, 865) // 832,5

  assert.equal(resumirFeedbacks(lista).media, 833)
  assert.equal(String(resumirFeedbacks(lista).media), comoOPainel(mediaDoBackend(lista)))
})

test('média x,49 segue a regra do backend em duas etapas e bate com o Painel', () => {
  const lista = [...notas(...Array(49).fill(833)), ...notas(...Array(51).fill(832))] // 832,49

  assert.equal(mediaDoBackend(lista), 832.5)
  assert.equal(resumirFeedbacks(lista).media, 833)
  assert.equal(String(resumirFeedbacks(lista).media), comoOPainel(mediaDoBackend(lista)))
})

test('média x,4615 (13 notas) também bate com o Painel', () => {
  const lista = notas(...Array(7).fill(833), ...Array(6).fill(832)) // 832,538...
  const outra = notas(...Array(6).fill(833), ...Array(7).fill(832)) // 832,4615...

  assert.equal(String(resumirFeedbacks(lista).media), comoOPainel(mediaDoBackend(lista)))
  assert.equal(mediaDoBackend(outra), 832.5)
  assert.equal(String(resumirFeedbacks(outra).media), comoOPainel(mediaDoBackend(outra)))
})

test('média x,44 arredonda para baixo nas duas etapas', () => {
  const lista = notas(...Array(44).fill(833), ...Array(56).fill(832)) // 832,44

  assert.equal(mediaDoBackend(lista), 832.4)
  assert.equal(resumirFeedbacks(lista).media, 832)
})

test('sem redações o resumo não tem média, com ou sem desempenho', () => {
  assert.deepEqual(resumirFeedbacks([]), { quantidade: 0, media: null })
  assert.deepEqual(
    resumirFeedbacks([], { mediaGeral: null, totalCorrigidas: 0, totalEnviadas: 0 }),
    { quantidade: 0, media: null },
  )
})

test('com o desempenho do backend, o resumo usa o valor dele', () => {
  const lista = notas(700, 800)

  assert.deepEqual(
    resumirFeedbacks(lista, { mediaGeral: 832.5, totalCorrigidas: 7, totalEnviadas: 9 }),
    { quantidade: 7, media: 833 },
  )
  // Resposta inválida do desempenho: volta à mesma regra aplicada à lista, sem quebrar.
  for (const ruim of [null, undefined, {}, { mediaGeral: 'x', totalCorrigidas: 2 }, { mediaGeral: 700, totalCorrigidas: 0 }]) {
    assert.deepEqual(resumirFeedbacks(lista, ruim), { quantidade: 2, media: 750 })
  }
})

test('mostra o professor só quando o backend o entrega em tema.turma.professor', () => {
  const comProfessor = redacao('p', { tema: { turma: { nome: 'Turma A', professor: { id: 'pr1', nome: '  Ana Lima ' } } } })

  assert.equal(obterProfessorDoFeedback(comProfessor), 'Ana Lima')
  for (const semDado of [
    redacao('a'),
    redacao('b', { tema: null }),
    redacao('c', { tema: { turma: { nome: 'Turma A' } } }),
    redacao('d', { tema: { turma: { professor: { nome: '   ' } } } }),
    redacao('e', { tema: { turma: { professor: { nome: 42 } } } }),
    null,
    undefined,
  ]) {
    assert.equal(obterProfessorDoFeedback(semDado), null)
  }
})
