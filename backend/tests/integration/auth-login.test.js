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
} from '../../src/modules/auth/auth.service.js'
import {
  criarHashToken,
  verificarAccessToken,
  verificarRefreshToken,
} from '../../src/modules/auth/auth-token.service.js'

const prefixoEmail = 'teste.login.'
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

describe('Login de usuário', () => {
  it('deve autenticar e persistir o refresh token', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`
    const senha = 'SenhaSegura123'

    const usuarioCriado = await cadastrarUsuario({
      nome: 'Aluno Login',
      email,
      senha,
      papel: 'ALUNO',
    })

    const sessao = await autenticarUsuario({
      email,
      senha,
    })

    assert.equal(sessao.usuario.id, usuarioCriado.id)
    assert.equal(
      Object.hasOwn(sessao.usuario, 'senhaHash'),
      false,
    )

    const accessPayload = verificarAccessToken(
      sessao.accessToken,
    )

    const refreshPayload = verificarRefreshToken(
      sessao.refreshToken,
    )

    assert.equal(accessPayload.sub, usuarioCriado.id)
    assert.equal(accessPayload.papel, 'ALUNO')
    assert.equal(refreshPayload.sub, usuarioCriado.id)
    assert.equal(typeof refreshPayload.familiaId, 'string')
    assert.equal(typeof refreshPayload.jti, 'string')

    const registro = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: criarHashToken(sessao.refreshToken),
      },
    })

    assert.ok(registro)
    assert.equal(registro.usuarioId, usuarioCriado.id)
    assert.equal(
      registro.familiaId,
      refreshPayload.familiaId,
    )
    assert.equal(registro.revogadoEm, null)
    assert.ok(registro.expiraEm.getTime() > Date.now())
  })

  it('deve rejeitar uma senha incorreta', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`

    await cadastrarUsuario({
      nome: 'Professor Login',
      email,
      senha: 'SenhaCorreta123',
      papel: 'PROFESSOR',
    })

    await assert.rejects(
      () =>
        autenticarUsuario({
          email,
          senha: 'SenhaIncorreta123',
        }),
      (error) => {
        assert.equal(error.statusCode, 401)
        assert.equal(error.code, 'INVALID_CREDENTIALS')

        return true
      },
    )
  })

  it('deve rejeitar um usuário inativo', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`

    const usuario = await cadastrarUsuario({
      nome: 'Usuário Inativo',
      email,
      senha: 'SenhaSegura123',
      papel: 'ALUNO',
    })

    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        ativo: false,
        desativadoEm: new Date(),
      },
    })

    await assert.rejects(
      () =>
        autenticarUsuario({
          email,
          senha: 'SenhaSegura123',
        }),
      (error) => {
        assert.equal(error.statusCode, 401)
        assert.equal(error.code, 'INVALID_CREDENTIALS')

        return true
      },
    )
  })
})