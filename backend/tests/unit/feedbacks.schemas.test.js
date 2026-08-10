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
        nota: 840,
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

    assert.equal(resultado.nota, 840)
    assert.equal(resultado.criterios.length, 1)
  })

  it('deve permitir um rascunho ainda sem nota e comentários', () => {
    const resultado =
      salvarFeedbackRascunhoSchema.parse({
        nota: null,
        comentarioGeral: '',
        criterios: [],
      })

    assert.equal(resultado.nota, null)
    assert.equal(resultado.comentarioGeral, null)
    assert.deepEqual(resultado.criterios, [])
  })

  it('deve rejeitar uma nota superior a 1000', () => {
    const resultado =
      salvarFeedbackRascunhoSchema.safeParse({
        nota: 1001,
        comentarioGeral: null,
        criterios: [],
      })

    assert.equal(resultado.success, false)
  })

  it('deve rejeitar um critério repetido', () => {
    const criterioId = randomUUID()
    const resultado =
      salvarFeedbackRascunhoSchema.safeParse({
        nota: 700,
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
