import { randomBytes } from 'node:crypto'

export const API_URL = 'http://127.0.0.1:3100'
export const WEB_URL = 'http://127.0.0.1:5180'

export function configurarAmbiente() {
  let url
  try {
    url = new URL(process.env.TEST_DATABASE_URL)
  } catch {
    throw new Error('Defina TEST_DATABASE_URL local para lexis_test; não compartilhe credenciais.')
  }
  if (!['mysql:', 'mariadb:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/lexis_test') {
    throw new Error('E2E aceita somente MySQL loopback no banco lexis_test.')
  }
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    // Exigida pela configuração Prisma; migrate deploy não usa shadow database.
    SHADOW_DATABASE_URL: new URL('/lexis_shadow_test', url).href,
    HOST: '127.0.0.1',
    PORT: '3100',
    FRONTEND_URL: WEB_URL,
    JWT_ACCESS_SECRET: randomBytes(64).toString('hex'),
    JWT_REFRESH_SECRET: randomBytes(64).toString('hex'),
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '1d',
    BCRYPT_ROUNDS: '10',
    OCR_SPACE_API_KEY: 'fixture-e2e-sem-provedor',
    OCR_SPACE_API_URL: 'https://ocr.fixture.invalid/parse/image',
    GEMINI_API_KEY: '',
    GEMINI_MODEL: 'fixture-e2e',
    LANGUAGETOOL_ENABLED: 'false',
    EMAIL_ENABLED: 'false',
    RESEND_API_KEY: '',
    EMAIL_DEMO_RECIPIENT: '',
  })
}
