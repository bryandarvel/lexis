import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  after,
  before,
  describe,
  it,
} from 'node:test'

import request from 'supertest'

import { app } from '../../src/app.js'
import { prisma } from '../../src/config/prisma.js'
import {
  cadastrarUsuario,
} from '../../src/modules/auth/auth.service.js'
import {
  verificarAccessToken,
} from '../../src/modules/auth/auth-token.service.js'

const prefixoEmail = 'teste.rota.login.'
let bancoDeTesteConfirmado = false

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe(
    'SELECT DATABASE() AS banco',
  )

  assert.equal(resultado.banco, 'lexis_test')
  bancoDeTesteConfirmado = true
})

after(async () => {
  if (bancoDeTesteConfirmado) {
    await prisma.usuario.deleteMany({
      where: {
        email: {
          startsWith: prefixoEmail,
        },
      },
    })
  }

  await prisma.$disconnect()
})

describe('POST /api/auth/login', () => {
  it('deve retornar o access token e definir o cookie', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`
    const senha = 'SenhaSegura123'

    const usuario = await cadastrarUsuario({
      nome: 'Usuário da Rota Login',
      email,
      senha,
      papel: 'PROFESSOR',
    })

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        senha,
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.equal(resposta.body.data.usuario.id, usuario.id)
    assert.equal(
      typeof resposta.body.data.accessToken,
      'string',
    )
    assert.equal(
      Object.hasOwn(
        resposta.body.data,
        'refreshToken',
      ),
      false,
    )

    const payload = verificarAccessToken(
      resposta.body.data.accessToken,
    )

    assert.equal(payload.sub, usuario.id)
    assert.equal(payload.papel, 'PROFESSOR')

    const cookies = resposta.headers['set-cookie']

    assert.ok(Array.isArray(cookies))

    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith('lexis_refresh_token='),
    )

    assert.ok(refreshCookie)
    assert.match(refreshCookie, /HttpOnly/i)
    assert.match(refreshCookie, /SameSite=Lax/i)
    assert.match(refreshCookie, /Path=\/api\/auth/i)
    assert.doesNotMatch(refreshCookie, /;\s*Secure/i)
  })

  it('deve retornar 401 sem criar cookie', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'inexistente@exemplo.com',
        senha: 'SenhaIncorreta123',
      })
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'INVALID_CREDENTIALS',
    )

    assert.equal(
      resposta.headers['set-cookie'],
      undefined,
    )
  })
})