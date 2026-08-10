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

const prefixoEmail = 'teste.rota.refresh.'
const nomeCookie = 'lexis_refresh_token'

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

function obterRefreshCookie(resposta) {
  const cookies = resposta.headers['set-cookie']

  assert.ok(Array.isArray(cookies))

  const refreshCookie = cookies.find((cookie) =>
    cookie.startsWith(`${nomeCookie}=`),
  )

  assert.ok(refreshCookie)

  return refreshCookie
}

function obterCookieParaRequisicao(refreshCookie) {
  return refreshCookie.split(';')[0]
}

async function criarUsuarioERealizarLogin() {
  const email =
    `${prefixoEmail}${randomUUID()}@exemplo.com`
  const senha = 'SenhaSegura123'

  const usuario = await cadastrarUsuario({
    nome: 'Usuário da Rota Refresh',
    email,
    senha,
    papel: 'ALUNO',
  })

  const respostaLogin = await request(app)
    .post('/api/auth/login')
    .send({
      email,
      senha,
    })
    .expect(200)

  return {
    usuario,
    refreshCookie: obterRefreshCookie(respostaLogin),
  }
}

describe('POST /api/auth/refresh', () => {
  it('deve rotacionar o cookie e retornar um novo access token', async () => {
    const {
      usuario,
      refreshCookie: refreshCookieInicial,
    } = await criarUsuarioERealizarLogin()

    const resposta = await request(app)
      .post('/api/auth/refresh')
      .set(
        'Cookie',
        obterCookieParaRequisicao(
          refreshCookieInicial,
        ),
      )
      .expect('Content-Type', /json/)
      .expect(200)

    assert.equal(
      resposta.body.data.usuario.id,
      usuario.id,
    )

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
    assert.equal(payload.papel, 'ALUNO')

    const novoRefreshCookie =
      obterRefreshCookie(resposta)

    assert.notEqual(
      obterCookieParaRequisicao(novoRefreshCookie),
      obterCookieParaRequisicao(
        refreshCookieInicial,
      ),
    )

    assert.match(novoRefreshCookie, /HttpOnly/i)
    assert.match(novoRefreshCookie, /SameSite=Lax/i)
    assert.match(
      novoRefreshCookie,
      /Path=\/api\/auth/i,
    )
  })

  it('deve retornar 401 e limpar o cookie quando ele estiver ausente', async () => {
    const resposta = await request(app)
      .post('/api/auth/refresh')
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'REFRESH_TOKEN_INVALID',
    )

    const cookieLimpo = obterRefreshCookie(resposta)

    assert.match(
      cookieLimpo,
      /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i,
    )
  })

  it('deve detectar a reutilização do cookie anterior', async () => {
    const {
      refreshCookie: refreshCookieInicial,
    } = await criarUsuarioERealizarLogin()

    await request(app)
      .post('/api/auth/refresh')
      .set(
        'Cookie',
        obterCookieParaRequisicao(
          refreshCookieInicial,
        ),
      )
      .expect(200)

    const respostaReutilizacao = await request(app)
      .post('/api/auth/refresh')
      .set(
        'Cookie',
        obterCookieParaRequisicao(
          refreshCookieInicial,
        ),
      )
      .expect(401)

    assert.equal(
      respostaReutilizacao.body.error.code,
      'REFRESH_TOKEN_REUSE_DETECTED',
    )

    const cookieLimpo = obterRefreshCookie(
      respostaReutilizacao,
    )

    assert.match(
      cookieLimpo,
      /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i,
    )
  })
})