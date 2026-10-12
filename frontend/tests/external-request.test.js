import assert from 'node:assert/strict'
import test from 'node:test'
import { avisoEstadoAnalise, TIMEOUT_ANALISE_IA_MS, TIMEOUT_OCR_MS } from '../src/utils/external-request.js'

test('chamadas externas têm margem sobre os limites máximos do servidor', () => {
  assert.equal(TIMEOUT_ANALISE_IA_MS, 200000)
  assert.equal(TIMEOUT_OCR_MS, 140000)
  assert.ok(TIMEOUT_ANALISE_IA_MS > 180000)
  assert.ok(TIMEOUT_OCR_MS > 120000)
})

test('consulta de análise não declara sucesso para erro ou processamento', () => {
  assert.equal(avisoEstadoAnalise({ status: 'CONCLUIDA' }).type, 'success')
  assert.equal(avisoEstadoAnalise({ status: 'ERRO' }).type, 'error')
  assert.equal(avisoEstadoAnalise({ status: 'PROCESSANDO' }).type, 'info')
  assert.equal(avisoEstadoAnalise(null).type, 'info')
})
