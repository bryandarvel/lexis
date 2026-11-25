import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configurarAmbiente } from './runtime.js'

test('recusa configuração ausente, remota ou de desenvolvimento antes de acessar Prisma', () => {
  for (const destino of [undefined, 'invalido', 'mysql://fixture@db.example.com/lexis_test', 'mysql://fixture@127.0.0.1/lexis', 'https://127.0.0.1/lexis_test']) {
    if (destino === undefined) delete process.env.TEST_DATABASE_URL
    else process.env.TEST_DATABASE_URL = destino
    assert.throws(configurarAmbiente, /TEST_DATABASE_URL|somente MySQL loopback/)
  }
})

test('isola runtime, gera JWTs distintos e desliga integrações reais', () => {
  process.env.TEST_DATABASE_URL = 'mysql://fixture@127.0.0.1:3307/lexis_test'
  process.env.EMAIL_ENABLED = 'true'
  process.env.GEMINI_API_KEY = 'valor-ficticio-nao-utilizavel'
  configurarAmbiente()
  assert.equal(process.env.NODE_ENV, 'test')
  assert.equal(process.env.DATABASE_URL, process.env.TEST_DATABASE_URL)
  assert.equal(process.env.EMAIL_ENABLED, 'false')
  assert.equal(process.env.GEMINI_API_KEY, '')
  assert.equal(process.env.RESEND_API_KEY, '')
  assert.equal(process.env.LANGUAGETOOL_ENABLED, 'false')
  assert.equal(process.env.OCR_SPACE_API_URL, 'https://ocr.fixture.invalid/parse/image')
  assert.match(process.env.JWT_ACCESS_SECRET, /^[a-f0-9]{128}$/)
  assert.match(process.env.JWT_REFRESH_SECRET, /^[a-f0-9]{128}$/)
  assert.notEqual(process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET)
})
