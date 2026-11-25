import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coincideComEvidenciaIa, trechoLiteralValido } from '../../src/modules/feedbacks/feedbacks.trechos.js'

test('valida intervalos literais UTF-16 sem normalizar espaços e sem cortar emoji', () => {
  const texto = '📚 Ação. '
  assert.equal(trechoLiteralValido(texto, { inicio: 0, fim: texto.length, trecho: texto }), true)
  assert.equal(trechoLiteralValido(texto, { inicio: 2, fim: texto.length, trecho: texto.slice(2) }), true)
  for (const [inicio, fim] of [[-1, 2], [0, 1], [1, 2], [2, 2], [0, 30], [0.5, 2]]) {
    assert.equal(trechoLiteralValido(texto, { inicio, fim, trecho: texto.slice(inicio, fim) }), false)
  }
  assert.equal(trechoLiteralValido(texto, { inicio: 0, fim: texto.length, trecho: texto.trim() }), false)
})

test('origem exige mesmo critério no snapshot e evidência exata LOCALIZADA, não só nome ou flag', () => {
  const criterio = { id: 'c1', nome: 'Legitimação', ordem: 1 }
  const trecho = { inicio: 0, fim: 5, trecho: 'fonte' }
  const analise = { criteriosSnapshot: [criterio], resultadoEstruturado: { analisePorCriterio: [
    { criterio: criterio.nome, ordem: 1, evidencias: [{ ...trecho, statusLocalizacao: 'LOCALIZADA' }] },
  ] } }
  assert.equal(coincideComEvidenciaIa(analise, criterio, trecho), true)
  assert.equal(coincideComEvidenciaIa(analise, { ...criterio, id: 'outro' }, trecho), false)
  assert.equal(coincideComEvidenciaIa(analise, { ...criterio, ordem: 2 }, trecho), false)
  assert.equal(coincideComEvidenciaIa(analise, criterio, { ...trecho, fim: 4, trecho: 'font' }), false)
  analise.resultadoEstruturado.analisePorCriterio[0].evidencias[0].statusLocalizacao = 'AMBIGUA'
  assert.equal(coincideComEvidenciaIa(analise, criterio, trecho), false)
  assert.equal(coincideComEvidenciaIa(undefined, criterio, trecho), false)
})
