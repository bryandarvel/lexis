import { z } from 'zod'

import { AppError } from '../../utils/app-error.js'

const textoObrigatorio = z
  .string()
  .trim()
  .min(1)

const itemTextual = textoObrigatorio.max(1000)

const evidenciaSchema = z
  .object({
    trecho: z
      .string()
      .min(1)
      .max(1000)
      .refine(
        (valor) => valor.trim().length > 0,
        'O trecho da evidência é obrigatório.',
      ),
    inicio: z.number().int().min(0),
    fim: z.number().int().min(1),
  })
  .strict()

export const analiseIaParamsSchema = z
  .object({
    redacaoId: z.uuid(
      'O identificador da redação é inválido.',
    ),
  })
  .strict()

const analiseCriterioSchema = z
  .object({
    ordem: z.number().int().min(1),
    criterio: textoObrigatorio.max(200),
    diagnostico: textoObrigatorio.max(3000),
    evidencias: z
      .array(evidenciaSchema)
      .max(8),
    orientacaoAoProfessor:
      textoObrigatorio.max(2000),
  })
  .strict()

export const resultadoAnaliseIaSchema = z
  .object({
    resumoGeral: textoObrigatorio.max(3000),
    pontosFortes: z
      .array(itemTextual)
      .max(8),
    pontosDeAtencao: z
      .array(itemTextual)
      .max(8),
    analisePorCriterio: z
      .array(analiseCriterioSchema)
      .min(1),
    observacoesFinais:
      textoObrigatorio.max(2000),
  })
  .strict()

export const formatoRespostaAnaliseIa = {
  type: 'text',
  mime_type: 'application/json',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      resumoGeral: {
        type: 'string',
      },
      pontosFortes: {
        type: 'array',
        maxItems: 8,
        items: {
          type: 'string',
        },
      },
      pontosDeAtencao: {
        type: 'array',
        maxItems: 8,
        items: {
          type: 'string',
        },
      },
      analisePorCriterio: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ordem: {
              type: 'integer',
              minimum: 1,
            },
            criterio: {
              type: 'string',
            },
            diagnostico: {
              type: 'string',
            },
            evidencias: {
              type: 'array',
              maxItems: 8,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  trecho: {
                    type: 'string',
                  },
                  inicio: {
                    type: 'integer',
                    minimum: 0,
                  },
                  fim: {
                    type: 'integer',
                    minimum: 1,
                  },
                },
                required: [
                  'trecho',
                  'inicio',
                  'fim',
                ],
              },
            },
            orientacaoAoProfessor: {
              type: 'string',
            },
          },
          required: [
            'ordem',
            'criterio',
            'diagnostico',
            'evidencias',
            'orientacaoAoProfessor',
          ],
        },
      },
      observacoesFinais: {
        type: 'string',
      },
    },
    required: [
      'resumoGeral',
      'pontosFortes',
      'pontosDeAtencao',
      'analisePorCriterio',
      'observacoesFinais',
    ],
  },
}

function criarErroRespostaInvalida(motivo) {
  return new AppError(
    'O serviço de inteligência artificial retornou uma análise inválida.',
    {
      statusCode: 502,
      code: 'GEMINI_INVALID_ANALYSIS',
      details: {
        motivo,
      },
    },
  )
}

function removerCercaMarkdown(texto) {
  return texto
    .trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '')
    .trim()
}

function extrairObjetoJson(texto) {
  const textoSemCerca = removerCercaMarkdown(texto)

  try {
    return JSON.parse(textoSemCerca)
  } catch {
    const inicioObjeto = textoSemCerca.indexOf('{')
    const fimObjeto = textoSemCerca.lastIndexOf('}')

    if (
      inicioObjeto === -1 ||
      fimObjeto <= inicioObjeto
    ) {
      throw criarErroRespostaInvalida(
        'JSON_INVALIDO',
      )
    }

    try {
      return JSON.parse(
        textoSemCerca.slice(
          inicioObjeto,
          fimObjeto + 1,
        ),
      )
    } catch {
      throw criarErroRespostaInvalida(
        'JSON_INVALIDO',
      )
    }
  }
}

function localizarOcorrencias(texto, trecho) {
  const ocorrencias = []
  let cursor = 0

  while (cursor <= texto.length - trecho.length) {
    const indice = texto.indexOf(trecho, cursor)

    if (indice === -1) {
      break
    }

    ocorrencias.push(indice)
    cursor = indice + 1
  }

  return ocorrencias
}

function normalizarEvidencia(
  evidencia,
  textoRedacao,
) {
  const posicaoValida =
    evidencia.fim > evidencia.inicio &&
    evidencia.fim <= textoRedacao.length &&
    textoRedacao.slice(
      evidencia.inicio,
      evidencia.fim,
    ) === evidencia.trecho

  if (posicaoValida) {
    return {
      ...evidencia,
      statusLocalizacao: 'LOCALIZADA',
      metodoLocalizacao: 'POSICAO_INFORMADA',
    }
  }

  const ocorrencias = localizarOcorrencias(
    textoRedacao,
    evidencia.trecho,
  )

  if (ocorrencias.length === 1) {
    const inicio = ocorrencias[0]

    return {
      ...evidencia,
      inicio,
      fim: inicio + evidencia.trecho.length,
      statusLocalizacao: 'LOCALIZADA',
      metodoLocalizacao: 'BUSCA_EXATA',
    }
  }

  return {
    trecho: evidencia.trecho,
    inicio: null,
    fim: null,
    statusLocalizacao:
      ocorrencias.length === 0
        ? 'NAO_LOCALIZADA'
        : 'AMBIGUA',
    metodoLocalizacao: null,
    quantidadeOcorrencias: ocorrencias.length,
  }
}

export function interpretarResultadoAnaliseIa({
  texto,
  criterios,
  textoRedacao,
}) {
  const valor = extrairObjetoJson(texto)

  const resultado =
    resultadoAnaliseIaSchema.safeParse(valor)

  if (!resultado.success) {
    throw criarErroRespostaInvalida(
      'ESTRUTURA_INVALIDA',
    )
  }

  const criteriosEsperados = [...criterios].sort(
    (criterioA, criterioB) =>
      criterioA.ordem - criterioB.ordem,
  )

  const criteriosRecebidos =
    resultado.data.analisePorCriterio

  if (
    criteriosRecebidos.length !==
    criteriosEsperados.length
  ) {
    throw criarErroRespostaInvalida(
      'QUANTIDADE_CRITERIOS_INCORRETA',
    )
  }

  const correspondeAOrdemDosCriterios =
    criteriosEsperados.every(
      (criterio, indice) => {
        const recebido = criteriosRecebidos[indice]

        return recebido.ordem === criterio.ordem
      },
    )

  if (!correspondeAOrdemDosCriterios) {
    throw criarErroRespostaInvalida(
      'ORDEM_CRITERIOS_INCORRETA',
    )
  }

  if (typeof textoRedacao !== 'string') {
    throw criarErroRespostaInvalida(
      'TEXTO_REDACAO_AUSENTE',
    )
  }

  return {
    ...resultado.data,
    analisePorCriterio:
      criteriosRecebidos.map(
        (criterioRecebido, indice) => ({
          ...criterioRecebido,
          criterio: criteriosEsperados[indice].nome,
          evidencias:
            criterioRecebido.evidencias.map(
              (evidencia) =>
                normalizarEvidencia(
                  evidencia,
                  textoRedacao,
                ),
            ),
        }),
      ),
  }
}
