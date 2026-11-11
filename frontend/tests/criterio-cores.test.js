import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TOM_NEUTRO,
  TOTAL_TONS_CRITERIO,
  obterTomCriterio,
} from '../src/utils/criterio-cores.js'
import { obterTomCriterio as tomDoAluno } from '../src/utils/aluno-feedback.js'
import { tomCriterio as tomDoProfessor } from '../src/utils/professor-correction.js'

const criterio = (ordem, nome = 'Critério') => ({ id: `c-${ordem}`, nome, ordem })

test('a cor vem da ordem e a paleta recomeça depois do último tom', () => {
  assert.equal(TOTAL_TONS_CRITERIO, 5)
  assert.equal(obterTomCriterio(1), '0')
  assert.equal(obterTomCriterio(5), '4')
  assert.equal(obterTomCriterio(6), '0')
  assert.equal(obterTomCriterio(12), '1')
})

test('aceita o critério inteiro ou só a ordem', () => {
  assert.equal(obterTomCriterio(criterio(2)), '1')
  assert.equal(obterTomCriterio(2), '1')
})

test('ordem inválida cai no tom neutro, sem quebrar', () => {
  for (const invalida of [0, -1, null, undefined, 2.5, '3', Number.NaN]) {
    assert.equal(obterTomCriterio(invalida), TOM_NEUTRO)
  }

  assert.equal(obterTomCriterio({}), TOM_NEUTRO)
  assert.equal(obterTomCriterio({ nome: 'Sem ordem' }), TOM_NEUTRO)
})

// O ponto da #44: o mesmo critério tem de receber a mesma cor nas duas telas.
test('professor e aluno derivam a mesma cor para o mesmo critério', () => {
  for (const ordem of [1, 2, 3, 4, 5, 6, 9]) {
    const atual = criterio(ordem)

    assert.equal(tomDoProfessor(atual), obterTomCriterio(ordem))
    assert.equal(tomDoAluno(ordem), obterTomCriterio(ordem))
  }
})

// Tema legado: o primeiro critério não é um dos três fixos. Antes, o professor
// colorava pelo nome e dava tom 3; o aluno, pela ordem, dava tom 0.
test('tema legado com critério fora da base recebe a mesma cor nas duas telas', () => {
  const legado = [
    criterio(1, 'Coesão'),
    criterio(2, 'Legitimação'),
    criterio(3, 'Pertinência'),
  ]

  assert.deepEqual(legado.map(tomDoProfessor), ['0', '1', '2'])
  assert.deepEqual(legado.map((c) => tomDoAluno(c.ordem)), ['0', '1', '2'])
})

test('tema legado com mais critérios que cores recomeça a paleta igual nas duas telas', () => {
  const muitos = Array.from({ length: 7 }, (_, i) => criterio(i + 1))

  assert.deepEqual(muitos.map(tomDoProfessor), ['0', '1', '2', '3', '4', '0', '1'])
  assert.deepEqual(
    muitos.map((c) => tomDoAluno(c.ordem)),
    muitos.map(tomDoProfessor),
  )
})

test('tema legado sem ordem recebe o neutro nas duas telas', () => {
  const semOrdem = { id: 'x', nome: 'Critério antigo' }

  assert.equal(tomDoProfessor(semOrdem), TOM_NEUTRO)
  assert.equal(tomDoAluno(semOrdem.ordem), TOM_NEUTRO)
})

test('a cor não depende de quantos critérios vieram nem da posição na lista', () => {
  const atual = criterio(4, 'Atualidade')

  // A regra antiga do professor usava o índice na lista renderizada.
  assert.equal(tomDoProfessor(atual), '3')
  assert.equal(tomDoProfessor(atual, 0), '3')
  assert.equal(tomDoProfessor(atual, 9), '3')
})
