import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  listarAnalisesIaParaProfessor,
  solicitarAnaliseIaParaProfessor,
} from '../../src/modules/avaliacao-ia/analise-ia.service.js'
import { AppError } from '../../src/utils/app-error.js'

const redacao = {
  id: 'redacao-1',
  texto: 'Texto da redação.',
  tema: {
    enunciado: 'Tema da redação',
    descricao: 'Descrição',
    instrucoes: null,
    criterios: [
      {
        id: 'criterio-1',
        nome: 'Argumentação',
        descricao: 'Avalia os argumentos.',
        ordem: 1,
      },
    ],
  },
}

function criarInicio(overrides = {}) {
  return {
    status: 'ANALISE_INICIADA',
    redacao,
    analise: {
      id: 'analise-1',
    },
    ...overrides,
  }
}

describe('Serviço de análise por IA', () => {
  it('deve concluir e persistir uma análise estruturada', async () => {
    let conclusaoRecebida

    const resultadoEstruturado = {
      resumoGeral: 'Resumo',
    }

    const resultado =
      await solicitarAnaliseIaParaProfessor(
        {
          redacaoId: 'redacao-1',
          professorId: 'professor-1',
        },
        {
          iniciar: async () => criarInicio(),
          criarSolicitacao: () => ({
            input: 'entrada',
            systemInstruction: 'instrução',
            responseFormat: {
              type: 'text',
            },
            generationConfig: {
              temperature: 0.2,
            },
          }),
          gerar: async () => ({
            texto: '{"resumoGeral":"Resumo"}',
          }),
          interpretar: () =>
            resultadoEstruturado,
          concluir: async (dados) => {
            conclusaoRecebida = dados

            return {
              id: dados.analiseId,
              status: 'CONCLUIDA',
            }
          },
          falhar: async () => {
            throw new Error(
              'Não deveria registrar falha.',
            )
          },
          agora: () =>
            new Date('2026-08-06T12:00:00.000Z'),
          obterTempoMs: (() => {
            const valores = [1000, 1450]

            return () => valores.shift()
          })(),
        },
      )

    assert.deepEqual(resultado, {
      id: 'analise-1',
      status: 'CONCLUIDA',
    })
    assert.equal(
      conclusaoRecebida.analiseId,
      'analise-1',
    )
    assert.equal(conclusaoRecebida.duracaoMs, 450)
    assert.equal(
      conclusaoRecebida.resultadoEstruturado,
      resultadoEstruturado,
    )
  })

  it('deve rejeitar uma redação indisponível antes de chamar a IA', async () => {
    let iaFoiChamada = false

    await assert.rejects(
      () =>
        solicitarAnaliseIaParaProfessor(
          {
            redacaoId: 'redacao-inexistente',
            professorId: 'professor-1',
          },
          {
            iniciar: async () => ({
              status: 'REDACAO_INDISPONIVEL',
            }),
            gerar: async () => {
              iaFoiChamada = true
            },
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 404)
        assert.equal(erro.code, 'ESSAY_NOT_FOUND')

        return true
      },
    )

    assert.equal(iaFoiChamada, false)
  })

  it('deve impedir duas análises simultâneas para a mesma redação', async () => {
    await assert.rejects(
      () =>
        solicitarAnaliseIaParaProfessor(
          {
            redacaoId: 'redacao-1',
            professorId: 'professor-1',
          },
          {
            iniciar: async () => ({
              status: 'ANALISE_EM_ANDAMENTO',
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 409)
        assert.equal(
          erro.code,
          'AI_ANALYSIS_IN_PROGRESS',
        )

        return true
      },
    )
  })

  it('deve registrar um erro sem apagar análises anteriores', async () => {
    let falhaRecebida

    const erroExterno = new AppError(
      'Limite externo atingido.',
      {
        statusCode: 503,
        code: 'GEMINI_SERVICE_LIMIT_REACHED',
      },
    )

    await assert.rejects(
      () =>
        solicitarAnaliseIaParaProfessor(
          {
            redacaoId: 'redacao-1',
            professorId: 'professor-1',
          },
          {
            iniciar: async () => criarInicio(),
            criarSolicitacao: () => ({
              input: 'entrada',
            }),
            gerar: async () => {
              throw erroExterno
            },
            falhar: async (dados) => {
              falhaRecebida = dados
            },
            obterTempoMs: (() => {
              const valores = [1000, 1300]

              return () => valores.shift()
            })(),
          },
        ),
      (erro) => erro === erroExterno,
    )

    assert.equal(falhaRecebida.analiseId, 'analise-1')
    assert.equal(falhaRecebida.duracaoMs, 300)
    assert.match(
      falhaRecebida.mensagemErro,
      /GEMINI_SERVICE_LIMIT_REACHED/,
    )
  })
})

describe('Histórico de análises por IA', () => {
  it('deve listar as análises preservando a ordem do repositório', async () => {
    const analises = [
      {
        id: 'analise-mais-recente',
        status: 'CONCLUIDA',
      },
      {
        id: 'analise-anterior',
        status: 'ERRO',
      },
    ]

    const resultado =
      await listarAnalisesIaParaProfessor(
        {
          redacaoId: 'redacao-1',
          professorId: 'professor-1',
        },
        {
          listar: async () => ({
            status: 'ANALISES_ENCONTRADAS',
            analises,
          }),
        },
      )

    assert.equal(resultado, analises)
  })

  it('deve ocultar redações indisponíveis para o professor', async () => {
    await assert.rejects(
      () =>
        listarAnalisesIaParaProfessor(
          {
            redacaoId: 'redacao-de-outro-professor',
            professorId: 'professor-1',
          },
          {
            listar: async () => ({
              status: 'REDACAO_INDISPONIVEL',
              analises: [],
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
