import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  consultarFeedbackParaProfessor,
  consultarFeedbackPublicadoParaAluno,
  publicarFeedbackParaProfessor,
  salvarFeedbackRascunhoParaProfessor,
} from '../../src/modules/feedbacks/feedbacks.service.js'

const competenciasCompletas = {
  competencia1: 160,
  competencia2: 200,
  competencia3: 160,
  competencia4: 160,
  competencia5: 160,
}

const competenciasVazias = {
  competencia1: null,
  competencia2: null,
  competencia3: null,
  competencia4: null,
  competencia5: null,
}

describe('Serviço de rascunho de feedback', () => {
  it('deve retornar a versão salva', async () => {
    const feedbackVersao = {
      id: 'feedback-versao-1',
      numero: 1,
      status: 'RASCUNHO',
    }

    const resultado =
      await salvarFeedbackRascunhoParaProfessor(
        {
          redacaoId: 'redacao-1',
          professorId: 'professor-1',
          ...competenciasCompletas,
          comentarioGeral: 'Comentário.',
          criterios: [],
        },
        {
          salvar: async () => ({
            status: 'RASCUNHO_SALVO',
            feedbackVersao,
          }),
        },
      )

    assert.equal(resultado, feedbackVersao)
  })

  it('deve ocultar redações indisponíveis', async () => {
    await assert.rejects(
      () =>
        salvarFeedbackRascunhoParaProfessor(
          {
            redacaoId: 'redacao-inexistente',
            professorId: 'professor-1',
            ...competenciasVazias,
            comentarioGeral: null,
            criterios: [],
          },
          {
            salvar: async () => ({
              status: 'REDACAO_INDISPONIVEL',
              feedbackVersao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 404)
        assert.equal(erro.code, 'ESSAY_NOT_FOUND')

        return true
      },
    )
  })

  it('deve rejeitar critérios de outro tema', async () => {
    await assert.rejects(
      () =>
        salvarFeedbackRascunhoParaProfessor(
          {
            redacaoId: 'redacao-1',
            professorId: 'professor-1',
            ...competenciasCompletas,
            comentarioGeral: null,
            criterios: [],
          },
          {
            salvar: async () => ({
              status: 'CRITERIOS_INVALIDOS',
              feedbackVersao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 422)
        assert.equal(
          erro.code,
          'FEEDBACK_CRITERIA_INVALID',
        )

        return true
      },
    )
  })
})

describe('Serviço de consulta de feedback', () => {
  it('deve separar a versão atual do histórico', async () => {
    const versaoMaisRecente = {
      id: 'versao-2',
      numero: 2,
    }
    const versaoAnterior = {
      id: 'versao-1',
      numero: 1,
    }

    const resultado = await consultarFeedbackParaProfessor(
      {
        redacaoId: 'redacao-1',
        professorId: 'professor-1',
      },
      {
        consultar: async () => ({
          status: 'FEEDBACK_CONSULTADO',
          feedback: {
            id: 'feedback-1',
            redacaoId: 'redacao-1',
            versoes: [
              versaoMaisRecente,
              versaoAnterior,
            ],
          },
        }),
      },
    )

    assert.deepEqual(
      resultado.versaoAtual,
      versaoMaisRecente,
    )
    assert.deepEqual(resultado.historico, [
      versaoMaisRecente,
      versaoAnterior,
    ])
  })

  it('deve retornar nulo quando ainda não existir feedback', async () => {
    const resultado = await consultarFeedbackParaProfessor(
      {
        redacaoId: 'redacao-1',
        professorId: 'professor-1',
      },
      {
        consultar: async () => ({
          status: 'FEEDBACK_CONSULTADO',
          feedback: null,
        }),
      },
    )

    assert.equal(resultado, null)
  })

  it('deve ocultar uma redação de outro professor', async () => {
    await assert.rejects(
      () =>
        consultarFeedbackParaProfessor(
          {
            redacaoId: 'redacao-1',
            professorId: 'professor-1',
          },
          {
            consultar: async () => ({
              status: 'REDACAO_INDISPONIVEL',
              feedback: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 404)
        assert.equal(erro.code, 'ESSAY_NOT_FOUND')
        return true
      },
    )
  })
})

describe('Serviço de publicação de feedback', () => {
  it('deve publicar usando o instante informado', async () => {
    const publicadoEm = new Date('2026-08-07T12:00:00.000Z')
    let dadosRecebidos
    const feedbackVersao = {
      id: 'versao-1',
      status: 'PUBLICADA',
    }
    const notificacao = {
      id: 'notificacao-1',
      tipo: 'FEEDBACK_PUBLICADO',
    }

    const resultado = await publicarFeedbackParaProfessor(
      {
        redacaoId: 'redacao-1',
        professorId: 'professor-1',
      },
      {
        agora: () => publicadoEm,
        publicar: async (dados) => {
          dadosRecebidos = dados
          return {
            status: 'FEEDBACK_PUBLICADO',
            feedbackVersao,
            notificacao,
          }
        },
      },
    )

    assert.deepEqual(dadosRecebidos, {
      redacaoId: 'redacao-1',
      professorId: 'professor-1',
      publicadoEm,
    })
    assert.deepEqual(resultado, {
      feedback: feedbackVersao,
      notificacao,
    })
  })

  it('deve exigir um rascunho', async () => {
    await assert.rejects(
      () =>
        publicarFeedbackParaProfessor(
          {
            redacaoId: 'redacao-1',
            professorId: 'professor-1',
          },
          {
            publicar: async () => ({
              status: 'RASCUNHO_AUSENTE',
              feedbackVersao: null,
              notificacao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 409)
        assert.equal(erro.code, 'FEEDBACK_DRAFT_REQUIRED')
        return true
      },
    )
  })

  it('deve informar os campos pendentes', async () => {
    await assert.rejects(
      () =>
        publicarFeedbackParaProfessor(
          {
            redacaoId: 'redacao-1',
            professorId: 'professor-1',
          },
          {
            publicar: async () => ({
              status: 'RASCUNHO_INCOMPLETO',
              camposPendentes: [
                'competencia1',
                'competencia2',
                'competencia3',
                'competencia4',
                'competencia5',
                'comentarioGeral',
              ],
              feedbackVersao: null,
              notificacao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 422)
        assert.equal(erro.code, 'FEEDBACK_INCOMPLETE')
        assert.deepEqual(erro.details.camposPendentes, [
          'competencia1',
          'competencia2',
          'competencia3',
          'competencia4',
          'competencia5',
          'comentarioGeral',
        ])
        return true
      },
    )
  })

  it('deve ocultar uma redação indisponível', async () => {
    await assert.rejects(
      () =>
        publicarFeedbackParaProfessor(
          {
            redacaoId: 'redacao-1',
            professorId: 'professor-1',
          },
          {
            publicar: async () => ({
              status: 'REDACAO_INDISPONIVEL',
              feedbackVersao: null,
              notificacao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 404)
        assert.equal(erro.code, 'ESSAY_NOT_FOUND')
        return true
      },
    )
  })
})

describe('Serviço de consulta do feedback pelo aluno', () => {
  it('deve retornar a versão publicada', async () => {
    const feedbackVersao = {
      id: 'versao-1',
      status: 'PUBLICADA',
    }

    const resultado =
      await consultarFeedbackPublicadoParaAluno(
        {
          redacaoId: 'redacao-1',
          alunoId: 'aluno-1',
        },
        {
          consultar: async () => ({
            status: 'FEEDBACK_PUBLICADO_ENCONTRADO',
            feedbackVersao,
          }),
        },
      )

    assert.equal(resultado, feedbackVersao)
  })

  it('deve ocultar redações de outros alunos', async () => {
    await assert.rejects(
      () =>
        consultarFeedbackPublicadoParaAluno(
          {
            redacaoId: 'redacao-1',
            alunoId: 'aluno-1',
          },
          {
            consultar: async () => ({
              status: 'REDACAO_INDISPONIVEL',
              feedbackVersao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 404)
        assert.equal(erro.code, 'ESSAY_NOT_FOUND')
        return true
      },
    )
  })

  it('deve ocultar feedbacks ainda não publicados', async () => {
    await assert.rejects(
      () =>
        consultarFeedbackPublicadoParaAluno(
          {
            redacaoId: 'redacao-1',
            alunoId: 'aluno-1',
          },
          {
            consultar: async () => ({
              status: 'FEEDBACK_INDISPONIVEL',
              feedbackVersao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 404)
        assert.equal(erro.code, 'FEEDBACK_NOT_AVAILABLE')
        return true
      },
    )
  })
})
