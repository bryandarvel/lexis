import assert from 'node:assert/strict'
import { test } from 'node:test'
import { swaggerSpec } from '../../src/docs/swagger.js'

test('OpenAPI descreve entrada estrita e resposta pública dos trechos sem referência privada', () => {
  const schemas = swaggerSpec.components.schemas
  assert.equal(schemas.FeedbackTrechoEntrada.additionalProperties, false)
  assert.ok(schemas.FeedbackTrechoEntrada.properties.analiseIaId)
  assert.equal(schemas.FeedbackTrechoEntrada.properties.sugeridoPorIa, undefined)
  assert.equal(schemas.FeedbackTrechoPublicado.additionalProperties, false)
  assert.equal(schemas.FeedbackTrechoPublicado.properties.analiseIaId, undefined)
  const put = swaggerSpec.paths['/api/redacoes/{redacaoId}/feedback'].put
  const trechos = put.requestBody.content['application/json'].schema.properties.criterios.items.properties.trechos
  assert.equal(trechos.maxItems, 20)
  assert.equal(trechos.items.$ref, '#/components/schemas/FeedbackTrechoEntrada')
})
