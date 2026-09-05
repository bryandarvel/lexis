import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  calcularNotaTotalCompetencias,
  extrairCompetencias,
} from '../../src/modules/feedbacks/feedbacks.competencias.js'

describe('Pontuação das competências do ENEM', () => {
  it('deve somar as cinco competências', () => {
    const competencias = {
      competencia1: 160,
      competencia2: 200,
      competencia3: 160,
      competencia4: 160,
      competencia5: 160,
    }

    assert.equal(
      calcularNotaTotalCompetencias(competencias),
      840,
    )
  })

  it('deve manter a nota total vazia durante um rascunho parcial', () => {
    const competencias = extrairCompetencias({
      competencia1: 160,
      competencia2: null,
      competencia3: null,
      competencia4: null,
      competencia5: null,
      campoForaDoContrato: 1000,
    })

    assert.equal(
      calcularNotaTotalCompetencias(competencias),
      null,
    )
    assert.equal(
      Object.hasOwn(
        competencias,
        'campoForaDoContrato',
      ),
      false,
    )
  })
})
