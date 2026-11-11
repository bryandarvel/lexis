import assert from 'node:assert/strict'
import test from 'node:test'

import {
  descreverSegmentoMarcado,
  montarTextoComTrechos,
} from '../src/utils/aluno-feedback.js'

const TEXTO = 'A educação midiática exige repertório. Veja o caso de 2019.'

const criterio = (ordem, nome, trechos) => ({
  id: `com-${ordem}`,
  comentario: 'Comentário humano.',
  criterio: { id: `c-${ordem}`, nome, ordem },
  trechos,
})

test('marca os trechos publicados e monta a legenda por critério', () => {
  const { segmentos, legenda, total } = montarTextoComTrechos(TEXTO, [
    criterio(1, 'Legitimação', [{ id: 't1', inicio: 2, fim: 20, trecho: 'educação midiática' }]),
    criterio(2, 'Pertinência', [{ id: 't2', inicio: 39, fim: 43, trecho: 'Veja' }]),
  ])

  assert.equal(total, 2)
  assert.deepEqual(
    legenda,
    [
      { ordem: 1, nome: 'Legitimação', tom: '0', quantidade: 1 },
      { ordem: 2, nome: 'Pertinência', tom: '1', quantidade: 1 },
    ],
  )

  // O texto é reconstruído sem perder nem repetir nada.
  assert.equal(segmentos.map((s) => s.texto).join(''), TEXTO)
  assert.deepEqual(
    segmentos.filter((s) => s.criterios.length).map((s) => s.texto),
    ['educação midiática', 'Veja'],
  )
})

test('trecho que não bate com o texto publicado não é marcado', () => {
  const { segmentos, legenda, total } = montarTextoComTrechos(TEXTO, [
    criterio(1, 'Legitimação', [
      { id: 't1', inicio: 2, fim: 20, trecho: 'texto que mudou' },
      { id: 't2', inicio: 0, fim: 9999, trecho: 'fora' },
    ]),
  ])

  assert.equal(total, 0)
  assert.deepEqual(legenda, [])
  assert.deepEqual(segmentos, [])
})

test('sem trechos, a tela não ganha marcação nenhuma', () => {
  for (const entrada of [[], undefined, [criterio(1, 'Legitimação', [])], [criterio(1, 'Legitimação', undefined)]]) {
    const resultado = montarTextoComTrechos(TEXTO, entrada)

    assert.deepEqual(resultado, { segmentos: [], legenda: [], total: 0 })
  }
})

test('texto ausente não quebra', () => {
  const comTrecho = [criterio(1, 'Legitimação', [{ inicio: 0, fim: 1, trecho: 'A' }])]

  assert.deepEqual(montarTextoComTrechos('', comTrecho), { segmentos: [], legenda: [], total: 0 })
  assert.deepEqual(montarTextoComTrechos(null, comTrecho), { segmentos: [], legenda: [], total: 0 })
})

test('critério sem ordem válida não entra na marcação', () => {
  const semOrdem = { id: 'x', comentario: 'c', criterio: { nome: 'Antigo' }, trechos: [{ inicio: 0, fim: 1, trecho: 'A' }] }

  assert.equal(montarTextoComTrechos(TEXTO, [semOrdem]).total, 0)
})

test('o mesmo trecho em dois critérios aparece uma vez, com os dois critérios', () => {
  const { segmentos, total } = montarTextoComTrechos(TEXTO, [
    criterio(1, 'Legitimação', [{ inicio: 2, fim: 20, trecho: 'educação midiática' }]),
    criterio(3, 'Uso produtivo', [{ inicio: 2, fim: 20, trecho: 'educação midiática' }]),
  ])
  const marcados = segmentos.filter((s) => s.criterios.length)

  assert.equal(total, 2)
  assert.equal(marcados.length, 1)
  assert.deepEqual(marcados[0].criterios, [1, 3])
})

test('a cor da marcação é a mesma regra das demais telas', () => {
  const { legenda } = montarTextoComTrechos(TEXTO, [
    criterio(6, 'Sexto critério', [{ inicio: 0, fim: 1, trecho: 'A' }]),
  ])

  // Sexto critério recomeça a paleta, como em criterio-cores.js.
  assert.equal(legenda[0].tom, '0')
})

test('o nome acessível cita os critérios, e não a cor', () => {
  const legenda = [
    { ordem: 1, nome: 'Legitimação', tom: '0', quantidade: 1 },
    { ordem: 3, nome: 'Uso produtivo', tom: '2', quantidade: 1 },
  ]

  assert.equal(
    descreverSegmentoMarcado({ texto: 'educação', criterios: [1, 3] }, legenda),
    'Trecho comentado em Legitimação, Uso produtivo: educação',
  )
  assert.equal(descreverSegmentoMarcado({ texto: 'x', criterios: [] }, legenda), '')
  assert.equal(descreverSegmentoMarcado({ texto: 'x', criterios: [9] }, legenda), '')
})

// O aluno não recebe analiseIaId; a tela também não anuncia origem por IA.
test('a marcação não carrega nada sobre origem por IA', () => {
  const { legenda, segmentos } = montarTextoComTrechos(TEXTO, [
    criterio(1, 'Legitimação', [
      { id: 't1', inicio: 2, fim: 20, trecho: 'educação midiática', sugeridoPorIa: true },
    ]),
  ])
  const serializado = JSON.stringify({ legenda, segmentos })

  assert.equal(serializado.includes('sugeridoPorIa'), false)
  assert.equal(serializado.includes('analiseIaId'), false)
})
