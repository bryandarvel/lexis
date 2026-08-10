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
  criarNotificacoesRouter,
} from '../../src/modules/notificacoes/notificacoes.routes.js'

function criarToken(papel, usuarioId = randomUUID()) {
  return criarAccessToken({
    usuarioId,
    papel,
  })
}

function criarAplicacao({
  listarNotificacoes = async () => ({
    notificacoes: [],
    totalNaoLidas: 0,
  }),
  marcarNotificacaoLida = async () => null,
} = {}) {
  const app = express()

  app.use(express.json())
  app.use(
    '/api',
    criarNotificacoesRouter({
      listarNotificacoes,
      marcarNotificacaoLida,
    }),
  )
  app.use(errorHandler)

  return app
}

describe('GET /api/aluno/notificacoes', () => {
  it('deve listar somente as notificações do aluno autenticado', async () => {
    const alunoId = randomUUID()
    let dadosRecebidos
    const resultado = {
      notificacoes: [
        {
          id: 'notificacao-1',
        },
      ],
      totalNaoLidas: 1,
    }
    const app = criarAplicacao({
      listarNotificacoes: async (dados) => {
        dadosRecebidos = dados
        return resultado
      },
    })

    const resposta = await request(app)
      .get('/api/aluno/notificacoes')
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO', alunoId)}`,
      )
      .expect(200)

    assert.deepEqual(dadosRecebidos, {
      alunoId,
    })
    assert.deepEqual(resposta.body.data, resultado)
  })

  it('deve impedir a listagem por professor', async () => {
    const app = criarAplicacao({
      listarNotificacoes: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .get('/api/aluno/notificacoes')
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR')}`,
      )
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })
})

describe('PATCH /api/aluno/notificacoes/:notificacaoId/lida', () => {
  it('deve marcar a notificação em nome do aluno', async () => {
    const alunoId = randomUUID()
    const notificacaoId = randomUUID()
    let dadosRecebidos
    const notificacao = {
      id: notificacaoId,
      lidaEm: '2026-08-07T15:00:00.000Z',
    }
    const app = criarAplicacao({
      marcarNotificacaoLida: async (dados) => {
        dadosRecebidos = dados
        return notificacao
      },
    })

    const resposta = await request(app)
      .patch(
        `/api/aluno/notificacoes/${notificacaoId}/lida`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO', alunoId)}`,
      )
      .expect(200)

    assert.deepEqual(dadosRecebidos, {
      notificacaoId,
      alunoId,
    })
    assert.deepEqual(
      resposta.body.data.notificacao,
      notificacao,
    )
  })

  it('deve validar o identificador da notificação', async () => {
    const app = criarAplicacao({
      marcarNotificacaoLida: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .patch('/api/aluno/notificacoes/id-invalido/lida')
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO')}`,
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })
})
