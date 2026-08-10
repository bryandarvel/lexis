import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'

import express from 'express'
import request from 'supertest'

import {
  criarLimitadorAnaliseIa,
} from '../../src/middlewares/analise-ia-rate-limiter.js'
import { errorHandler } from '../../src/middlewares/error-handler.js'
import {
  criarAnalisesIaRouter,
} from '../../src/modules/avaliacao-ia/analise-ia.routes.js'
import {
  criarAccessToken,
} from '../../src/modules/auth/auth-token.service.js'
import { AppError } from '../../src/utils/app-error.js'

function criarAplicacao({
  solicitarAnalise,
  listarAnalises = async () => [],
  limitador = (_req, _res, next) => next(),
}) {
  const app = express()

  app.use(express.json())
  app.use(
    '/api',
    criarAnalisesIaRouter({
      solicitarAnalise,
      listarAnalises,
      limitador,
    }),
  )
  app.use(errorHandler)

  return app
}

function criarToken(papel, usuarioId = randomUUID()) {
  return criarAccessToken({
    usuarioId,
    papel,
  })
}

describe('POST /api/redacoes/:redacaoId/analises-ia', () => {
  it('deve solicitar a análise em nome do professor autenticado', async () => {
    const redacaoId = randomUUID()
    const professorId = randomUUID()
    let dadosRecebidos

    const app = criarAplicacao({
      solicitarAnalise: async (dados) => {
        dadosRecebidos = dados

        return {
          id: 'analise-1',
          status: 'CONCLUIDA',
        }
      },
    })

    const resposta = await request(app)
      .post(`/api/redacoes/${redacaoId}/analises-ia`)
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR', professorId)}`,
      )
      .expect(201)

    assert.deepEqual(dadosRecebidos, {
      redacaoId,
      professorId,
    })
    assert.deepEqual(resposta.body, {
      data: {
        analise: {
          id: 'analise-1',
          status: 'CONCLUIDA',
        },
      },
    })
  })

  it('deve exigir autenticação', async () => {
    const app = criarAplicacao({
      solicitarAnalise: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .post(
        `/api/redacoes/${randomUUID()}/analises-ia`,
      )
      .expect(401)

    assert.equal(
      resposta.body.error.code,
      'AUTHENTICATION_REQUIRED',
    )
  })

  it('deve rejeitar um aluno autenticado', async () => {
    const app = criarAplicacao({
      solicitarAnalise: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .post(
        `/api/redacoes/${randomUUID()}/analises-ia`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO')}`,
      )
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })

  it('deve rejeitar um identificador de redação inválido', async () => {
    const app = criarAplicacao({
      solicitarAnalise: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .post('/api/redacoes/id-invalido/analises-ia')
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR')}`,
      )
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })

  it('deve encaminhar erros controlados do serviço', async () => {
    const app = criarAplicacao({
      solicitarAnalise: async () => {
        throw new AppError(
          'O serviço de IA está indisponível.',
          {
            statusCode: 503,
            code: 'GEMINI_SERVICE_UNAVAILABLE',
          },
        )
      },
    })

    const resposta = await request(app)
      .post(
        `/api/redacoes/${randomUUID()}/analises-ia`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR')}`,
      )
      .expect(503)

    assert.equal(
      resposta.body.error.code,
      'GEMINI_SERVICE_UNAVAILABLE',
    )
  })

  it('deve limitar as solicitações por professor', async () => {
    const professorId = randomUUID()
    const token = criarToken(
      'PROFESSOR',
      professorId,
    )
    const app = criarAplicacao({
      solicitarAnalise: async () => ({
        id: randomUUID(),
        status: 'CONCLUIDA',
      }),
      limitador: criarLimitadorAnaliseIa({
        limite: 2,
        windowMs: 60_000,
      }),
    })

    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      await request(app)
        .post(
          `/api/redacoes/${randomUUID()}/analises-ia`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(201)
    }

    const resposta = await request(app)
      .post(
        `/api/redacoes/${randomUUID()}/analises-ia`,
      )
      .set('Authorization', `Bearer ${token}`)
      .expect(429)

    assert.equal(
      resposta.body.error.code,
      'AI_ANALYSIS_RATE_LIMIT_EXCEEDED',
    )
  })
})

describe('GET /api/redacoes/:redacaoId/analises-ia', () => {
  it('deve retornar o histórico ao professor autenticado', async () => {
    const redacaoId = randomUUID()
    const professorId = randomUUID()
    let dadosRecebidos
    const analises = [
      {
        id: 'analise-2',
        status: 'CONCLUIDA',
      },
      {
        id: 'analise-1',
        status: 'ERRO',
      },
    ]

    const app = criarAplicacao({
      solicitarAnalise: async () => null,
      listarAnalises: async (dados) => {
        dadosRecebidos = dados

        return analises
      },
    })

    const resposta = await request(app)
      .get(`/api/redacoes/${redacaoId}/analises-ia`)
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR', professorId)}`,
      )
      .expect(200)

    assert.deepEqual(dadosRecebidos, {
      redacaoId,
      professorId,
    })
    assert.deepEqual(
      resposta.body.data.analises,
      analises,
    )
  })

  it('deve impedir a consulta por aluno', async () => {
    const app = criarAplicacao({
      solicitarAnalise: async () => null,
      listarAnalises: async () => {
        throw new Error('Não deveria ser chamado.')
      },
    })

    const resposta = await request(app)
      .get(
        `/api/redacoes/${randomUUID()}/analises-ia`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO')}`,
      )
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })
})
