import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  after,
  before,
  describe,
  it,
} from 'node:test'

import { prisma } from '../../src/config/prisma.js'
import {
  autenticarUsuario,
  cadastrarUsuario,
  renovarSessao,
} from '../../src/modules/auth/auth.service.js'
import {
  criarHashToken,
  verificarAccessToken,
  verificarRefreshToken,
} from '../../src/modules/auth/auth-token.service.js'

const prefixoEmail = 'teste.refresh.'
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

async function criarSessaoDeTeste() {
  const email = `${prefixoEmail}${randomUUID()}@exemplo.com`
  const senha = 'SenhaSegura123'

  await cadastrarUsuario({
    nome: 'Usuário Refresh',
    email,
    senha,
    papel: 'ALUNO',
  })

  return autenticarUsuario({
    email,
    senha,
  })
}

describe('Rotação do refresh token', () => {
  it('deve revogar o token atual e criar outro', async () => {
    const sessaoInicial = await criarSessaoDeTeste()

    const sessaoRenovada = await renovarSessao(
      sessaoInicial.refreshToken,
    )

    assert.notEqual(
      sessaoRenovada.refreshToken,
      sessaoInicial.refreshToken,
    )

    const accessPayload = verificarAccessToken(
      sessaoRenovada.accessToken,
    )

    const refreshPayloadInicial = verificarRefreshToken(
      sessaoInicial.refreshToken,
    )

    const refreshPayloadNovo = verificarRefreshToken(
      sessaoRenovada.refreshToken,
    )

    assert.equal(
      refreshPayloadNovo.familiaId,
      refreshPayloadInicial.familiaId,
    )

    assert.equal(
      accessPayload.sub,
      refreshPayloadNovo.sub,
    )

    const registroAntigo =
      await prisma.refreshToken.findUnique({
        where: {
          tokenHash: criarHashToken(
            sessaoInicial.refreshToken,
          ),
        },
      })

    const registroNovo =
      await prisma.refreshToken.findUnique({
        where: {
          tokenHash: criarHashToken(
            sessaoRenovada.refreshToken,
          ),
        },
      })

    assert.ok(registroAntigo.revogadoEm)
    assert.equal(registroNovo.revogadoEm, null)
  })

  it('deve revogar a família ao reutilizar token antigo', async () => {
    const sessaoInicial = await criarSessaoDeTeste()

    const sessaoRenovada = await renovarSessao(
      sessaoInicial.refreshToken,
    )

    const payload = verificarRefreshToken(
      sessaoRenovada.refreshToken,
    )

    await assert.rejects(
      () => renovarSessao(sessaoInicial.refreshToken),
      (error) => {
        assert.equal(error.statusCode, 401)
        assert.equal(
          error.code,
          'REFRESH_TOKEN_REUSE_DETECTED',
        )

        return true
      },
    )

    const tokensDaFamilia =
      await prisma.refreshToken.findMany({
        where: {
          familiaId: payload.familiaId,
        },
      })

    assert.ok(
      tokensDaFamilia.every(
        (token) => token.revogadoEm instanceof Date,
      ),
    )
  })

  it('deve rejeitar um token inválido', async () => {
    await assert.rejects(
      () => renovarSessao('token-invalido'),
      (error) => {
        assert.equal(error.statusCode, 401)
        assert.equal(error.code, 'REFRESH_TOKEN_INVALID')

        return true
      },
    )
  })
})