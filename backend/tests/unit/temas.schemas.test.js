import assert from 'node:assert/strict'
import test from 'node:test'
import { criteriosSchema, criarTemaSchema, substituirCriteriosSchema } from '../../src/modules/temas/temas.schemas.js'
import { obterModeloCompetenciaDois } from '../../src/modules/temas/temas.competencia-dois.js'

const base = () => obterModeloCompetenciaDois().criterios
const extra = (nome) => ({ nome, descricao: 'Descrição de um critério adicional.' })

test('aceita somente a base canônica com zero, um ou dois extras', () => {
  for (let quantidade = 0; quantidade <= 2; quantidade++) {
    const criterios = [...base(), ...Array.from({ length: quantidade }, (_, i) => extra(`Extra ${i}`))]
    assert.equal(criteriosSchema.safeParse(criterios).success, true)
    assert.equal(substituirCriteriosSchema.safeParse({ criterios }).success, true)
    assert.equal(criarTemaSchema.safeParse({ enunciado: 'Proposta de teste', descricao: 'Descrição da proposta de teste.', prazoEntrega: '2030-01-01T00:00:00Z', criterios }).success, true)
  }
})

test('rejeita remoção, alteração, reordenação, duplicatas e pesos', () => {
  const alterados = base()
  alterados[0].descricao = 'Outra descrição que muda o contrato.'
  const comPeso = base()
  comPeso[0].peso = 1
  const invalidos = [
    [], base().slice(1), [extra('Outro'), ...base().slice(1)], alterados,
    base().reverse(), comPeso,
    [...base(), extra('Extra A'), extra('Extra B'), extra('Extra C')],
    [...base(), extra('legitimacao')],
    [...base(), extra('Uso   produtivo')],
    [...base(), extra('Fonte'), extra('fonte')],
  ]
  for (const criterios of invalidos) {
    assert.equal(criteriosSchema.safeParse(criterios).success, false)
  }
})
