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

const prefixoEmail = 'teste.rota.me.'

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

async function criarUsuarioComSessao() {
  const email =
    `${prefixoEmail}${randomUUID()}@exemplo.com`
  const senha = 'SenhaSegura123'

  const usuario = await cadastrarUsuario({
    nome: 'Usuário da Rota Me',
    email,
    senha,
    papel: 'ALUNO',
  })

  const sessao = await autenticarUsuario({
    email,
    senha,
  })

  return {
    usuario,
    sessao,
  }
}

describe('GET /api/auth/me', () => {
  it('deve retornar o usuário autenticado', async () => {
    const { usuario, sessao } =
      await criarUsuarioComSessao()

    const resposta = await request(app)
      .get('/api/auth/me')
      .set(
        'Authorization',
        `Bearer ${sessao.accessToken}`,
      )
      .expect('Content-Type', /json/)
      .expect(200)

    assert.equal(
      resposta.body.data.usuario.id,
      usuario.id,
    )

    assert.equal(
      resposta.body.data.usuario.email,
      usuario.email,
    )

    assert.equal(
      resposta.body.data.usuario.papel,
      'ALUNO',
    )

    assert.equal(
      Object.hasOwn(
        resposta.body.data.usuario,
        'senhaHash',
      ),
      false,
    )
  })

  it('deve retornar 401 sem access token', async () => {
    const resposta = await request(app)
      .get('/api/auth/me')
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })

  it('deve retornar 401 para access token inválido', async () => {
    const resposta = await request(app)
      .get('/api/auth/me')
      .set(
        'Authorization',
        'Bearer token-invalido',
      )
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'ACCESS_TOKEN_INVALID',
    )
  })

  it('deve rejeitar um usuário desativado', async () => {
    const { usuario, sessao } =
      await criarUsuarioComSessao()

    await prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        ativo: false,
        desativadoEm: new Date(),
      },
    })

    const resposta = await request(app)
      .get('/api/auth/me')
      .set(
        'Authorization',
        `Bearer ${sessao.accessToken}`,
      )
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })
})