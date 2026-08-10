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
  criarFeedbacksRouter,
} from '../../src/modules/feedbacks/feedbacks.routes.js'

function criarAplicacao(
  salvarFeedback,
  consultarFeedback = async () => null,
  publicarFeedback = async () => null,
  consultarFeedbackAluno = async () => null,
) {
  const app = express()

  app.use(express.json())
  app.use(
    '/api',
    criarFeedbacksRouter({
      consultarFeedbackAluno,
      consultarFeedback,
      publicarFeedback,
      salvarFeedback,
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

describe('PUT /api/redacoes/:redacaoId/feedback', () => {
  it('deve salvar o rascunho em nome do professor autenticado', async () => {
    const redacaoId = randomUUID()
    const professorId = randomUUID()
    const criterioId = randomUUID()
    let dadosRecebidos

    const app = criarAplicacao(async (dados) => {
      dadosRecebidos = dados

      return {
        id: 'feedback-versao-1',
        numero: 1,
        status: 'RASCUNHO',
      }
    })

    const body = {
      nota: 850,
      comentarioGeral: 'Comentário geral.',
      criterios: [
        {
          criterioId,
          comentario: 'Comentário específico.',
        },
      ],
    }

    const resposta = await request(app)
      .put(`/api/redacoes/${redacaoId}/feedback`)
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR', professorId)}`,
      )
      .send(body)
      .expect(200)

    assert.deepEqual(dadosRecebidos, {
      redacaoId,
      professorId,
      ...body,
    })
    assert.equal(
      resposta.body.data.feedback.status,
      'RASCUNHO',
    )
  })

  it('deve impedir que um aluno salve a correção', async () => {
    const app = criarAplicacao(async () => {
      throw new Error('Não deveria ser chamado.')
    })

    const resposta = await request(app)
      .put(
        `/api/redacoes/${randomUUID()}/feedback`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO')}`,
      )
      .send({
        nota: null,
        comentarioGeral: null,
        criterios: [],
      })
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })

  it('deve validar o intervalo da nota antes do serviço', async () => {
    const app = criarAplicacao(async () => {
      throw new Error('Não deveria ser chamado.')
    })

    const resposta = await request(app)
      .put(
        `/api/redacoes/${randomUUID()}/feedback`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR')}`,
      )
      .send({
        nota: -1,
        comentarioGeral: null,
        criterios: [],
      })
      .expect(422)

    assert.equal(
      resposta.body.error.code,
      'VALIDATION_ERROR',
    )
  })
})

describe('GET /api/redacoes/:redacaoId/feedback', () => {
  it('deve retornar a versão atual e o histórico ao professor', async () => {
    const redacaoId = randomUUID()
    const professorId = randomUUID()
    let dadosRecebidos
    const feedback = {
      id: 'feedback-1',
      versaoAtual: {
        id: 'versao-2',
        numero: 2,
      },
      historico: [
        {
          id: 'versao-2',
          numero: 2,
        },
        {
          id: 'versao-1',
          numero: 1,
        },
      ],
    }

    const app = criarAplicacao(
      async () => null,
      async (dados) => {
        dadosRecebidos = dados
        return feedback
      },
    )

    const resposta = await request(app)
      .get(`/api/redacoes/${redacaoId}/feedback`)
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
      resposta.body.data.feedback,
      feedback,
    )
  })

  it('deve impedir que um aluno consulte a correção', async () => {
    const app = criarAplicacao(
      async () => null,
      async () => {
        throw new Error('Não deveria ser chamado.')
      },
    )

    const resposta = await request(app)
      .get(
        `/api/redacoes/${randomUUID()}/feedback`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO')}`,
      )
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })
})

describe('POST /api/redacoes/:redacaoId/feedback/publicar', () => {
  it('deve publicar a correção em nome do professor', async () => {
    const redacaoId = randomUUID()
    const professorId = randomUUID()
    let dadosRecebidos
    const resultado = {
      feedback: {
        id: 'versao-1',
        status: 'PUBLICADA',
      },
      notificacao: {
        id: 'notificacao-1',
        tipo: 'FEEDBACK_PUBLICADO',
      },
    }

    const app = criarAplicacao(
      async () => null,
      async () => null,
      async (dados) => {
        dadosRecebidos = dados
        return resultado
      },
    )

    const resposta = await request(app)
      .post(
        `/api/redacoes/${redacaoId}/feedback/publicar`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR', professorId)}`,
      )
      .expect(200)

    assert.deepEqual(dadosRecebidos, {
      redacaoId,
      professorId,
    })
    assert.deepEqual(resposta.body.data, resultado)
  })

  it('deve impedir que um aluno publique a correção', async () => {
    const app = criarAplicacao(
      async () => null,
      async () => null,
      async () => {
        throw new Error('Não deveria ser chamado.')
      },
    )

    const resposta = await request(app)
      .post(
        `/api/redacoes/${randomUUID()}/feedback/publicar`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO')}`,
      )
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })
})

describe('GET /api/aluno/redacoes/:redacaoId/feedback', () => {
  it('deve retornar somente a correção publicada ao aluno', async () => {
    const redacaoId = randomUUID()
    const alunoId = randomUUID()
    let dadosRecebidos
    const feedback = {
      id: 'versao-1',
      numero: 1,
      status: 'PUBLICADA',
      nota: 850,
    }

    const app = criarAplicacao(
      async () => null,
      async () => null,
      async () => null,
      async (dados) => {
        dadosRecebidos = dados
        return feedback
      },
    )

    const resposta = await request(app)
      .get(`/api/aluno/redacoes/${redacaoId}/feedback`)
      .set(
        'Authorization',
        `Bearer ${criarToken('ALUNO', alunoId)}`,
      )
      .expect(200)

    assert.deepEqual(dadosRecebidos, {
      redacaoId,
      alunoId,
    })
    assert.deepEqual(
      resposta.body.data.feedback,
      feedback,
    )
  })

  it('deve impedir que um professor use a consulta do aluno', async () => {
    const app = criarAplicacao(
      async () => null,
      async () => null,
      async () => null,
      async () => {
        throw new Error('Não deveria ser chamado.')
      },
    )

    const resposta = await request(app)
      .get(
        `/api/aluno/redacoes/${randomUUID()}/feedback`,
      )
      .set(
        'Authorization',
        `Bearer ${criarToken('PROFESSOR')}`,
      )
      .expect(403)

    assert.equal(resposta.body.error.code, 'FORBIDDEN')
  })
})
