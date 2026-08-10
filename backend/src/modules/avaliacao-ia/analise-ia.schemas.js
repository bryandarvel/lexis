import { z } from 'zod'

import { AppError } from '../../utils/app-error.js'

const textoObrigatorio = z
  .string()
  .trim()
  .min(1)

const itemTextual = textoObrigatorio.max(1000)

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
      .array(itemTextual)
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
                type: 'string',
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

export function interpretarResultadoAnaliseIa({
  texto,
  criterios,
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

  return {
    ...resultado.data,
    analisePorCriterio:
      criteriosRecebidos.map(
        (criterioRecebido, indice) => ({
          ...criterioRecebido,
          criterio: criteriosEsperados[indice].nome,
        }),
      ),
  }
}
