import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  criarSolicitacaoAnaliseIa,
  VERSAO_PROMPT_ANALISE_IA,
} from '../../src/modules/avaliacao-ia/analise-ia.prompt.js'
import {
  formatoRespostaAnaliseIa,
  interpretarResultadoAnaliseIa,
} from '../../src/modules/avaliacao-ia/analise-ia.schemas.js'

const criterios = [
  {
    id: 'criterio-2',
    nome: 'Argumentação',
    descricao: 'Avalia a construção dos argumentos.',
    ordem: 2,
  },
  {
    id: 'criterio-1',
    nome: 'Repertório sociocultural',
    descricao: 'Avalia o uso de repertórios.',
    ordem: 1,
  },
]

const textoRedacao = [
  'A referência foi articulada à tese.',
  'Existe relação entre causa e consequência.',
].join(' ')

function criarEvidencia(trecho) {
  const inicio = textoRedacao.indexOf(trecho)

  return {
    trecho,
    inicio,
    fim: inicio + trecho.length,
  }
}

const resultadoValido = {
  resumoGeral: 'A redação apresenta uma tese clara.',
  pontosFortes: [
    'O repertório está relacionado ao tema.',
  ],
  pontosDeAtencao: [
    'Um argumento precisa ser aprofundado.',
  ],
  analisePorCriterio: [
    {
      ordem: 1,
      criterio: 'Repertório sociocultural',
      diagnostico: 'O repertório é pertinente.',
      evidencias: [
        criarEvidencia(
          'A referência foi articulada à tese.',
        ),
      ],
      orientacaoAoProfessor:
        'Verificar a precisão da referência.',
    },
    {
      ordem: 2,
      criterio: 'Argumentação',
      diagnostico: 'Os argumentos são coerentes.',
      evidencias: [
        criarEvidencia(
          'Existe relação entre causa e consequência.',
        ),
      ],
      orientacaoAoProfessor:
        'Avaliar se o desenvolvimento é suficiente.',
    },
  ],
  observacoesFinais:
    'A análise deve ser revisada pelo professor.',
}

describe('Solicitação de análise por IA', () => {
  it('deve criar um prompt versionado sem identificadores pessoais', () => {
    const solicitacao = criarSolicitacaoAnaliseIa({
      texto: 'Texto da redação.',
      tema: {
        enunciado: 'Tema da redação',
        descricao: 'Descrição do tema',
        instrucoes: null,
      },
      criterios,
    })

    assert.equal(
      solicitacao.versaoPrompt,
      VERSAO_PROMPT_ANALISE_IA,
    )
    assert.equal(
      solicitacao.generationConfig.temperature,
      0.2,
    )
    assert.equal(
      solicitacao.responseFormat,
      formatoRespostaAnaliseIa,
    )

    const dados = JSON.parse(solicitacao.input)

    assert.deepEqual(
      dados.criterios.map((criterio) =>
        criterio.ordem,
      ),
      [1, 2],
    )
    assert.equal(
      Object.hasOwn(dados.criterios[0], 'id'),
      false,
    )
    assert.equal(
      solicitacao.input.includes('email'),
      false,
    )
    assert.equal(
      solicitacao.input.includes('alunoId'),
      false,
    )
    assert.equal(
      solicitacao.input.includes('professorId'),
      false,
    )
  })

  it('deve preservar os critérios completos no snapshot', () => {
    const solicitacao = criarSolicitacaoAnaliseIa({
      texto: 'Texto da redação.',
      tema: {
        enunciado: 'Tema da redação',
      },
      criterios,
    })

    assert.deepEqual(
      solicitacao.criteriosSnapshot.map(
        (criterio) => criterio.id,
      ),
      ['criterio-1', 'criterio-2'],
    )
  })

  it('deve solicitar JSON sem campo de nota numérica', () => {
    const schema = formatoRespostaAnaliseIa.schema

    assert.equal(
      formatoRespostaAnaliseIa.type,
      'text',
    )
    assert.equal(
      formatoRespostaAnaliseIa.mime_type,
      'application/json',
    )
    assert.equal(
      Object.hasOwn(schema.properties, 'nota'),
      false,
    )
    assert.equal(
      schema.properties.analisePorCriterio.properties,
      undefined,
    )
    assert.equal(
      schema.properties.analisePorCriterio.items.properties
        .evidencias.items.type,
      'object',
    )
  })
})

describe('Resultado estruturado da análise por IA', () => {
  it('deve validar uma análise com todos os critérios', () => {
    const resultado = interpretarResultadoAnaliseIa({
      texto: JSON.stringify(resultadoValido),
      criterios,
      textoRedacao,
    })

    assert.equal(
      resultado.analisePorCriterio[0].evidencias[0]
        .statusLocalizacao,
      'LOCALIZADA',
    )
    assert.equal(
      resultado.analisePorCriterio[0].evidencias[0]
        .metodoLocalizacao,
      'POSICAO_INFORMADA',
    )
  })

  it('deve aceitar JSON envolvido por uma cerca Markdown', () => {
    const resultado = interpretarResultadoAnaliseIa({
      texto: `\`\`\`json\n${JSON.stringify(resultadoValido)}\n\`\`\``,
      criterios,
      textoRedacao,
    })

    assert.equal(resultado.resumoGeral, resultadoValido.resumoGeral)
  })

  it('deve restaurar os nomes canônicos dos critérios', () => {
    const resultadoComNomesAlterados = {
      ...resultadoValido,
      analisePorCriterio:
        resultadoValido.analisePorCriterio.map(
          (item) => ({
            ...item,
            criterio: `Nome externo ${item.ordem}`,
          }),
        ),
    }

    const resultado = interpretarResultadoAnaliseIa({
      texto: JSON.stringify(
        resultadoComNomesAlterados,
      ),
      criterios,
      textoRedacao,
    })

    assert.deepEqual(
      resultado.analisePorCriterio.map(
        (item) => item.criterio,
      ),
      [
        'Repertório sociocultural',
        'Argumentação',
      ],
    )
  })

  it('deve rejeitar um JSON inválido', () => {
    assert.throws(
      () =>
        interpretarResultadoAnaliseIa({
          texto: '{json-invalido',
          criterios,
          textoRedacao,
        }),
      (erro) => {
        assert.equal(erro.statusCode, 502)
        assert.equal(
          erro.code,
          'GEMINI_INVALID_ANALYSIS',
        )
        assert.equal(
          erro.details.motivo,
          'JSON_INVALIDO',
        )

        return true
      },
    )
  })

  it('deve rejeitar critérios ausentes', () => {
    const resultadoIncompleto = {
      ...resultadoValido,
      analisePorCriterio:
        resultadoValido.analisePorCriterio.slice(0, 1),
    }

    assert.throws(
      () =>
        interpretarResultadoAnaliseIa({
          texto: JSON.stringify(resultadoIncompleto),
          criterios,
          textoRedacao,
        }),
      (erro) => {
        assert.equal(
          erro.code,
          'GEMINI_INVALID_ANALYSIS',
        )
        assert.equal(
          erro.details.motivo,
          'QUANTIDADE_CRITERIOS_INCORRETA',
        )

        return true
      },
    )
  })

  it('deve rejeitar critérios fora da ordem esperada', () => {
    const resultadoForaDeOrdem = {
      ...resultadoValido,
      analisePorCriterio: [
        {
          ...resultadoValido.analisePorCriterio[0],
          ordem: 2,
        },
        {
          ...resultadoValido.analisePorCriterio[1],
          ordem: 1,
        },
      ],
    }

    assert.throws(
      () =>
        interpretarResultadoAnaliseIa({
          texto: JSON.stringify(
            resultadoForaDeOrdem,
          ),
          criterios,
          textoRedacao,
        }),
      (erro) => {
        assert.equal(
          erro.details.motivo,
          'ORDEM_CRITERIOS_INCORRETA',
        )

        return true
      },
    )
  })

  it('deve rejeitar uma nota numérica inesperada', () => {
    const resultadoComNota = {
      ...resultadoValido,
      nota: 900,
    }

    assert.throws(
      () =>
        interpretarResultadoAnaliseIa({
          texto: JSON.stringify(resultadoComNota),
          criterios,
          textoRedacao,
        }),
      (erro) => {
        assert.equal(
          erro.code,
          'GEMINI_INVALID_ANALYSIS',
        )

        return true
      },
    )
  })

  it('deve recuperar uma posição incorreta quando o trecho é único', () => {
    const resultadoComPosicaoIncorreta = {
      ...resultadoValido,
      analisePorCriterio:
        resultadoValido.analisePorCriterio.map(
          (criterio, indice) => ({
            ...criterio,
            evidencias:
              indice === 0
                ? [
                    {
                      ...criterio.evidencias[0],
                      inicio: 999,
                      fim: 1000,
                    },
                  ]
                : criterio.evidencias,
          }),
        ),
    }

    const resultado = interpretarResultadoAnaliseIa({
      texto: JSON.stringify(resultadoComPosicaoIncorreta),
      criterios,
      textoRedacao,
    })
    const evidencia =
      resultado.analisePorCriterio[0].evidencias[0]

    assert.equal(evidencia.statusLocalizacao, 'LOCALIZADA')
    assert.equal(evidencia.metodoLocalizacao, 'BUSCA_EXATA')
    assert.equal(
      textoRedacao.slice(evidencia.inicio, evidencia.fim),
      evidencia.trecho,
    )
  })

  it('deve sinalizar um trecho repetido quando a posição não o desambigua', () => {
    const textoComRepeticao = 'repete e repete'
    const resultadoComRepeticao = {
      ...resultadoValido,
      analisePorCriterio:
        resultadoValido.analisePorCriterio.map(
          (criterio, indice) => ({
            ...criterio,
            evidencias:
              indice === 0
                ? [
                    {
                      trecho: 'repete',
                      inicio: 50,
                      fim: 56,
                    },
                  ]
                : [],
          }),
        ),
    }

    const resultado = interpretarResultadoAnaliseIa({
      texto: JSON.stringify(resultadoComRepeticao),
      criterios,
      textoRedacao: textoComRepeticao,
    })
    const evidencia =
      resultado.analisePorCriterio[0].evidencias[0]

    assert.equal(evidencia.statusLocalizacao, 'AMBIGUA')
    assert.equal(evidencia.quantidadeOcorrencias, 2)
    assert.equal(evidencia.inicio, null)
    assert.equal(evidencia.fim, null)
  })

  it('deve sinalizar uma evidência inexistente sem inventar posição', () => {
    const resultadoComTrechoInexistente = {
      ...resultadoValido,
      analisePorCriterio:
        resultadoValido.analisePorCriterio.map(
          (criterio, indice) => ({
            ...criterio,
            evidencias:
              indice === 0
                ? [
                    {
                      trecho: 'Trecho inventado.',
                      inicio: 0,
                      fim: 18,
                    },
                  ]
                : [],
          }),
        ),
    }

    const resultado = interpretarResultadoAnaliseIa({
      texto: JSON.stringify(resultadoComTrechoInexistente),
      criterios,
      textoRedacao,
    })
    const evidencia =
      resultado.analisePorCriterio[0].evidencias[0]

    assert.equal(
      evidencia.statusLocalizacao,
      'NAO_LOCALIZADA',
    )
    assert.equal(evidencia.quantidadeOcorrencias, 0)
    assert.equal(evidencia.inicio, null)
    assert.equal(evidencia.fim, null)
  })
})
