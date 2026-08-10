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
  autenticarUsuario,
  cadastrarUsuario,
} from '../../src/modules/auth/auth.service.js'
import {
  verificarRefreshToken,
} from '../../src/modules/auth/auth-token.service.js'

const prefixoEmail = 'teste.rota.logout.'
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

function criarCookieRequisicao(refreshToken) {
  return `${nomeCookie}=${refreshToken}`
}

function verificarCookieLimpo(resposta) {
  const cookies = resposta.headers['set-cookie']

  assert.ok(Array.isArray(cookies))

  const refreshCookie = cookies.find((cookie) =>
    cookie.startsWith(`${nomeCookie}=`),
  )

  assert.ok(refreshCookie)

  assert.match(
    refreshCookie,
    /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i,
  )

  assert.match(
    refreshCookie,
    /Path=\/api\/auth/i,
  )
}

async function criarSessaoDeTeste() {
  const email =
    `${prefixoEmail}${randomUUID()}@exemplo.com`
  const senha = 'SenhaSegura123'

  await cadastrarUsuario({
    nome: 'Usuário da Rota Logout',
    email,
    senha,
    papel: 'PROFESSOR',
  })

  return autenticarUsuario({
    email,
    senha,
  })
}

describe('POST /api/auth/logout', () => {
  it('deve revogar a sessão e limpar o cookie', async () => {
    const sessao = await criarSessaoDeTeste()

    const payload = verificarRefreshToken(
      sessao.refreshToken,
    )

    const resposta = await request(app)
      .post('/api/auth/logout')
      .set(
        'Cookie',
        criarCookieRequisicao(
          sessao.refreshToken,
        ),
      )
      .expect(204)

    assert.equal(resposta.text, '')
    verificarCookieLimpo(resposta)

    const tokensDaFamilia =
      await prisma.refreshToken.findMany({
        where: {
          familiaId: payload.familiaId,
        },
      })

    assert.ok(tokensDaFamilia.length > 0)

    assert.ok(
      tokensDaFamilia.every(
        (token) => token.revogadoEm instanceof Date,
      ),
    )

    const respostaRefresh = await request(app)
      .post('/api/auth/refresh')
      .set(
        'Cookie',
        criarCookieRequisicao(
          sessao.refreshToken,
        ),
      )
      .expect(401)

    assert.equal(
      respostaRefresh.body.error.code,
      'REFRESH_TOKEN_REUSE_DETECTED',
    )
  })

  it('deve ser idempotente quando não houver cookie', async () => {
    const resposta = await request(app)
      .post('/api/auth/logout')
      .expect(204)

    verificarCookieLimpo(resposta)
  })

  it('deve ser idempotente quando o cookie for inválido', async () => {
    const resposta = await request(app)
      .post('/api/auth/logout')
      .set(
        'Cookie',
        criarCookieRequisicao('token-invalido'),
      )
      .expect(204)

    verificarCookieLimpo(resposta)
  })
})