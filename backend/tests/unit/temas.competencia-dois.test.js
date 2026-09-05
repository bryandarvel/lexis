import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MODELO_COMPETENCIA_DOIS,
  obterModeloCompetenciaDois,
} from '../../src/modules/temas/temas.competencia-dois.js'

test('oferece os três critérios canônicos da Competência II', () => {
  const modelo = obterModeloCompetenciaDois()

  assert.equal(modelo.versao, 1)
  assert.deepEqual(
    modelo.criterios.map((criterio) => criterio.nome),
    ['Legitimação', 'Pertinência', 'Uso produtivo'],
  )
})

test('retorna uma cópia editável sem alterar o modelo global', () => {
  const modelo = obterModeloCompetenciaDois()
  modelo.criterios[0].nome = 'Critério personalizado'
  modelo.criterios.push({
    nome: 'Novo',
    descricao: 'Descrição nova.',
  })

  assert.equal(
    MODELO_COMPETENCIA_DOIS.criterios[0].nome,
    'Legitimação',
  )
  assert.equal(obterModeloCompetenciaDois().criterios.length, 3)
})
