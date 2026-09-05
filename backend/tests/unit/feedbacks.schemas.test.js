import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'

import {
  salvarFeedbackRascunhoSchema,
} from '../../src/modules/feedbacks/feedbacks.schemas.js'

describe('Schema do rascunho de feedback', () => {
  it('deve aceitar uma correção completa', () => {
    const resultado =
      salvarFeedbackRascunhoSchema.parse({
        competencia1: 160,
        competencia2: 200,
        competencia3: 160,
        competencia4: 160,
        competencia5: 160,
        comentarioGeral:
          'A redação desenvolve bem o tema.',
        criterios: [
          {
            criterioId: randomUUID(),
            comentario:
              'O repertório foi articulado ao argumento.',
          },
        ],
      })

    assert.equal(resultado.competencia2, 200)
    assert.equal(resultado.criterios.length, 1)
  })

  it('deve permitir um rascunho ainda sem notas e comentários', () => {
    const resultado =
      salvarFeedbackRascunhoSchema.parse({
        competencia1: null,
        competencia2: null,
        competencia3: null,
        competencia4: null,
        competencia5: null,
        comentarioGeral: '',
        criterios: [],
      })

    assert.equal(resultado.competencia1, null)
    assert.equal(resultado.comentarioGeral, null)
    assert.deepEqual(resultado.criterios, [])
  })

  it('deve rejeitar uma competência superior a 200', () => {
    const resultado =
      salvarFeedbackRascunhoSchema.safeParse({
        competencia1: 201,
        competencia2: 160,
        competencia3: 160,
        competencia4: 160,
        competencia5: 160,
        comentarioGeral: null,
        criterios: [],
      })

    assert.equal(resultado.success, false)
  })

  it('deve rejeitar um critério repetido', () => {
    const criterioId = randomUUID()
    const resultado =
      salvarFeedbackRascunhoSchema.safeParse({
        competencia1: 120,
        competencia2: 160,
        competencia3: 120,
        competencia4: 160,
        competencia5: 120,
        comentarioGeral: null,
        criterios: [
          {
            criterioId,
            comentario: 'Primeiro comentário.',
          },
          {
            criterioId,
            comentario: 'Segundo comentário.',
          },
        ],
      })

    assert.equal(resultado.success, false)
  })
})
