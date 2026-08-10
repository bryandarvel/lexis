import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  after,
  before,
  describe,
  it,
} from 'node:test'

import { prisma } from '../../src/config/prisma.js'
import { cadastrarUsuario } from '../../src/modules/auth/auth.service.js'
import { verificarSenha } from '../../src/modules/auth/password.service.js'

const prefixoEmail = 'teste.cadastro.'
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

describe('Cadastro de usuário', () => {
  it('deve cadastrar um usuário com senha protegida', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`
    const senha = 'SenhaSegura123'

    const usuario = await cadastrarUsuario({
      nome: 'Aluno de Teste',
      email,
      senha,
      papel: 'ALUNO',
    })

    assert.equal(usuario.email, email)
    assert.equal(usuario.papel, 'ALUNO')
    assert.equal(usuario.ativo, true)
    assert.equal(
      Object.hasOwn(usuario, 'senhaHash'),
      false,
    )

    const usuarioNoBanco = await prisma.usuario.findUnique({
      where: {
        email,
      },
    })

    assert.ok(usuarioNoBanco)
    assert.notEqual(usuarioNoBanco.senhaHash, senha)
    assert.equal(
      await verificarSenha(senha, usuarioNoBanco.senhaHash),
      true,
    )
  })

  it('deve rejeitar um e-mail já cadastrado', async () => {
    const email = `${prefixoEmail}${randomUUID()}@exemplo.com`

    await cadastrarUsuario({
      nome: 'Primeiro Usuário',
      email,
      senha: 'SenhaSegura123',
      papel: 'PROFESSOR',
    })

    await assert.rejects(
      () =>
        cadastrarUsuario({
          nome: 'Segundo Usuário',
          email,
          senha: 'OutraSenha123',
          papel: 'ALUNO',
        }),
      (error) => {
        assert.equal(error.statusCode, 409)
        assert.equal(error.code, 'EMAIL_ALREADY_IN_USE')

        return true
      },
    )
  })
})