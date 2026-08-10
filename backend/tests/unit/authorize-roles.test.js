import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  autorizarPapeis,
} from '../../src/middlewares/authorize-roles.js'

describe('Middleware de autorização por papel', () => {
  it('deve autorizar um professor em rota de professor', () => {
    const middleware = autorizarPapeis('PROFESSOR')

    const req = {
      auth: {
        usuarioId: 'professor-de-teste',
        papel: 'PROFESSOR',
      },
    }

    let erroRecebido
    let quantidadeChamadas = 0

    middleware(req, {}, (error) => {
      erroRecebido = error
      quantidadeChamadas += 1
    })

    assert.equal(quantidadeChamadas, 1)
    assert.equal(erroRecebido, undefined)
  })

  it('deve rejeitar um aluno em rota de professor', () => {
    const middleware = autorizarPapeis('PROFESSOR')

    const req = {
      auth: {
        usuarioId: 'aluno-de-teste',
        papel: 'ALUNO',
      },
    }

    let erroRecebido

    middleware(req, {}, (error) => {
      erroRecebido = error
    })

    assert.equal(erroRecebido.statusCode, 403)
    assert.equal(erroRecebido.code, 'FORBIDDEN')
  })

  it('deve rejeitar uma requisição não autenticada', () => {
    const middleware = autorizarPapeis('PROFESSOR')

    const req = {}

    let erroRecebido

    middleware(req, {}, (error) => {
      erroRecebido = error
    })

    assert.equal(erroRecebido.statusCode, 401)

    assert.equal(
      erroRecebido.code,
      'AUTHENTICATION_REQUIRED',
    )
  })

  it('deve aceitar mais de um papel permitido', () => {
    const middleware = autorizarPapeis(
      'PROFESSOR',
      'ALUNO',
    )

    const req = {
      auth: {
        usuarioId: 'aluno-de-teste',
        papel: 'ALUNO',
      },
    }

    let erroRecebido

    middleware(req, {}, (error) => {
      erroRecebido = error
    })

    assert.equal(erroRecebido, undefined)
  })

  it('deve rejeitar uma configuração sem papel válido', () => {
    assert.throws(
      () => autorizarPapeis('ADMINISTRADOR'),
      {
        name: 'TypeError',
      },
    )

    assert.throws(
      () => autorizarPapeis(),
      {
        name: 'TypeError',
      },
    )
  })
})