import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { swaggerSpec } from '../../src/docs/swagger.js'

describe('Contrato OpenAPI', () => {
  it('deve expor o health check na documentação', () => {
    assert.ok(swaggerSpec.paths['/health'])
    assert.equal(
      swaggerSpec.paths['/health'].get.tags[0],
      'Infraestrutura',
    )
  })
})
