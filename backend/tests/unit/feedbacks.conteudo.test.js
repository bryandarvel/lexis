import assert from 'node:assert/strict'
import { test } from 'node:test'

import { mesmoConteudoFeedback } from '../../src/modules/feedbacks/feedbacks.conteudo.js'

const original = {
  id: 'versao-1',
  numero: 1,
  competencia1: 120,
  competencia2: 160,
  competencia3: 120,
  competencia4: 140,
  competencia5: 160,
  comentarioGeral: 'Comentário fictício.',
  criterios: [
    {
      criterioId: 'c1',
      comentario: 'Veja duas referências.',
      trechos: [
        { inicio: 2, fim: 8, trecho: ' Ação ', sugeridoPorIa: true, analiseIaId: 'origem-1' },
        { inicio: 8, fim: 13, trecho: 'fonte' },
      ],
    },
    { criterioId: 'c2', comentario: 'Comentário sem trecho.', trechos: [] },
  ],
}

test('compara por valor, ignorando a ordem e a origem, sem reordenar os objetos recebidos', () => {
  const rascunho = structuredClone(original)
  rascunho.id = 'versao-2'
  rascunho.numero = 2
  rascunho.publicadoEm = null
  rascunho.criterios[0].id = 'registro-2'
  rascunho.criterios[0].trechos[0].analiseIaId = null
  rascunho.criterios[0].trechos[0].sugeridoPorIa = false
  rascunho.criterios[0].trechos.reverse()
  rascunho.criterios.reverse()
  const antes = structuredClone(rascunho)
  assert.equal(mesmoConteudoFeedback(rascunho, original), true)
  assert.deepEqual(rascunho, antes)
})

for (const [campo, alterar] of [
  ['distribuição das notas com o mesmo total', (d) => { d.competencia1 += 1; d.competencia2 -= 1 }],
  ['pontuação do comentário geral', (d) => { d.comentarioGeral += '!' }],
  ['espaço interno do comentário', (d) => { d.criterios[0].comentario = 'Veja  duas referências.' }],
  ['identidade do critério', (d) => { d.criterios[1].criterioId = 'c3' }],
  ['offset UTF-16 do trecho', (d) => { d.criterios[0].trechos[0].inicio += 1 }],
  ['forma Unicode do trecho', (d) => { d.criterios[0].trechos[0].trecho = d.criterios[0].trechos[0].trecho.normalize('NFD') }],
  ['lista vazia de trechos', (d) => { d.criterios[0].trechos = [] }],
]) {
  test(`considera diferente uma mudança em ${campo}`, () => {
    const rascunho = structuredClone(original)
    alterar(rascunho)
    assert.equal(mesmoConteudoFeedback(rascunho, original), false)
  })
}
