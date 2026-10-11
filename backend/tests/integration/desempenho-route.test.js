import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'

import express from 'express'
import request from 'supertest'

import { errorHandler } from '../../src/middlewares/error-handler.js'
import {
  criarAccessToken,
} from '../../src/modules/auth/auth-token.service.js'
import {
  criarDesempenhoRouter,
} from '../../src/modules/desempenho/desempenho.routes.js'

function criarToken(papel, usuarioId = randomUUID()) {
  return criarAccessToken({
    usuarioId,
    papel,
  })
}

function criarAplicacao({
  obterDesempenho = async () => null,
} = {}) {
  const app = express()

  app.use(express.json())
  app.use(
    '/api',
    criarDesempenhoRouter({
      obterDesempenho,
    }),
  )
  app.use(errorHandler)

  return app
}

describe('GET /api/aluno/desempenho', () => {
  it('deve retornar o desempenho do aluno autenticado', async () => {
    const alunoId = randomUUID()
    let dadosRecebidos
    const desempenho = {
      mediaGeral: 830,
      ultimaNota: 880,
      mediaCompetencia2: 150,
      totalEnviadas: 2,
      totalCorrigidas: 2,
    }
    const app = criarAplicacao({
      obterDesempenho: async (dados) => {
        dadosRecebidos = dados
        return desempenho
      },
    })

    const resposta = await request(app)
      .get('/api/aluno/desempenho')
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO', alunoId)}`,
      )
      .expect('Content-Type', /json/)
      .expect(200)

    assert.deepEqual(dadosRecebidos, {
      alunoId,
    })
    assert.deepEqual(
      resposta.body.data.desempenho,
      desempenho,
    )
  })

  it('deve manter os campos nulos sem correção publicada', async () => {
    const desempenho = {
      mediaGeral: null,
      ultimaNota: null,
      mediaCompetencia2: null,
      totalEnviadas: 0,
      totalCorrigidas: 0,
    }
    const app = criarAplicacao({
      obterDesempenho: async () => desempenho,
    })

    const resposta = await request(app)
      .get('/api/aluno/desempenho')
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO')}`,
      )
      .expect(200)

    assert.deepEqual(
      resposta.body.data.desempenho,
      desempenho,
    )
  })

  it('deve impedir a consulta por professor', async () => {
    const app = criarAplicacao({
      obterDesempenho: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .get('/api/aluno/desempenho')
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR')}`,
      )
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })

  it('deve exigir autenticação', async () => {
    const app = criarAplicacao({
      obterDesempenho: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .get('/api/aluno/desempenho')
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })
})
