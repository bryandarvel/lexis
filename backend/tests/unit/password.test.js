import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  criarHashSenha,
  verificarSenha,
} from '../../src/modules/auth/password.service.js'

describe('Serviço de senha', () => {
  it('deve criar um hash e validar a senha correta', async () => {
    const senha = 'SenhaSegura123!'

    const senhaHash = await criarHashSenha(senha)

    assert.notEqual(senhaHash, senha)
    assert.match(senhaHash, /^\$2[aby]\$/)

    assert.equal(
      await verificarSenha(senha, senhaHash),
      true,
    )

    assert.equal(
      await verificarSenha('SenhaIncorreta123!', senhaHash),
      false,
    )
  })

  it('deve gerar hashes diferentes para a mesma senha', async () => {
    const senha = 'OutraSenhaSegura123!'

    const primeiroHash = await criarHashSenha(senha)
    const segundoHash = await criarHashSenha(senha)

    assert.notEqual(primeiroHash, segundoHash)
  })
})