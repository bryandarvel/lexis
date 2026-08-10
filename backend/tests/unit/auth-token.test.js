import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  criarAccessToken,
  criarHashToken,
  criarRefreshToken,
  obterExpiracaoToken,
  verificarAccessToken,
  verificarRefreshToken,
} from '../../src/modules/auth/auth-token.service.js'

describe('Serviço de tokens JWT', () => {
  const usuarioId = 'usuario-de-teste'
  const familiaId = 'familia-de-teste'

  it('deve criar e verificar um access token', () => {
    const token = criarAccessToken({
      usuarioId,
      papel: 'ALUNO',
    })

    const payload = verificarAccessToken(token)

    assert.equal(payload.sub, usuarioId)
    assert.equal(payload.tipo, 'access')
    assert.equal(payload.papel, 'ALUNO')
    assert.equal(payload.iss, 'lexis-api')
    assert.equal(payload.aud, 'lexis-web')
  })

  it('deve criar e verificar um refresh token', () => {
    const token = criarRefreshToken({
      usuarioId,
      familiaId,
    })

    const payload = verificarRefreshToken(token)
    const expiraEm = obterExpiracaoToken(token)

    assert.equal(payload.sub, usuarioId)
    assert.equal(payload.tipo, 'refresh')
    assert.equal(payload.familiaId, familiaId)
    assert.ok(expiraEm.getTime() > Date.now())
  })

  it('deve criar um hash determinístico do refresh token', () => {
    const token = criarRefreshToken({
      usuarioId,
      familiaId,
    })

    const primeiroHash = criarHashToken(token)
    const segundoHash = criarHashToken(token)

    assert.equal(primeiroHash, segundoHash)
    assert.notEqual(primeiroHash, token)
    assert.match(primeiroHash, /^[0-9a-f]{64}$/)
  })

  it('deve rejeitar um access token como refresh token', () => {
    const accessToken = criarAccessToken({
      usuarioId,
      papel: 'PROFESSOR',
    })

    assert.throws(
      () => verificarRefreshToken(accessToken),
      (error) => {
        assert.equal(error.statusCode, 401)
        assert.equal(error.code, 'REFRESH_TOKEN_INVALID')

        return true
      },
    )
  })
})