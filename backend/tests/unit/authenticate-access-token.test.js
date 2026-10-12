import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  criarAutenticadorAccessToken,
} from '../../src/middlewares/authenticate-access-token.js'
import {
  criarAccessToken,
  criarRefreshToken,
} from '../../src/modules/auth/auth-token.service.js'

const autenticarAccessToken = criarAutenticadorAccessToken({
  buscarUsuario: async () => ({ ativo: true, sessaoVersao: 0, papel: 'PROFESSOR' }),
})

describe('Middleware de autenticação', () => {
  it('deve autenticar um access token válido', async () => {
    const token = criarAccessToken({
      usuarioId: 'usuario-de-teste',
      papel: 'PROFESSOR',
    })

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    }

    let erroRecebido
    let quantidadeChamadas = 0

    await autenticarAccessToken(
      req,
      {},
      (error) => {
        erroRecebido = error
        quantidadeChamadas += 1
      },
    )

    assert.equal(quantidadeChamadas, 1)
    assert.equal(erroRecebido, undefined)

    assert.deepEqual(req.auth, {
      usuarioId: 'usuario-de-teste',
      papel: 'PROFESSOR',
    })
  })

  it('deve rejeitar uma requisição sem cabeçalho', () => {
    const req = {
      headers: {},
    }

    let erroRecebido

    autenticarAccessToken(
      req,
      {},
      (error) => {
        erroRecebido = error
      },
    )

    assert.equal(erroRecebido.statusCode, 401)

    assert.equal(
      erroRecebido.code,
      'AUTHENTICATION_REQUIRED',
    )
  })

  it('deve rejeitar um cabeçalho malformado', () => {
    const req = {
      headers: {
        authorization: 'Token valor-invalido',
      },
    }

    let erroRecebido

    autenticarAccessToken(
      req,
      {},
      (error) => {
        erroRecebido = error
      },
    )

    assert.equal(erroRecebido.statusCode, 401)

    assert.equal(
      erroRecebido.code,
      'AUTHENTICATION_REQUIRED',
    )
  })

  it('deve rejeitar um refresh token como access token', () => {
    const refreshToken = criarRefreshToken({
      usuarioId: 'usuario-de-teste',
      familiaId: 'familia-de-teste',
    })

    const req = {
      headers: {
        authorization: `Bearer ${refreshToken}`,
      },
    }

    let erroRecebido

    autenticarAccessToken(
      req,
      {},
      (error) => {
        erroRecebido = error
      },
    )

    assert.equal(erroRecebido.statusCode, 401)

    assert.equal(
      erroRecebido.code,
      'ACCESS_TOKEN_INVALID',
    )
  })
})
