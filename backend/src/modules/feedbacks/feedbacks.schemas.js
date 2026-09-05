import { z } from 'zod'

const comentarioOpcional = z
  .union([
    z
      .string()
      .trim()
      .max(
        10000,
        'O comentário geral deve possuir no máximo 10000 caracteres.',
      )
      .transform((comentario) =>
        comentario.length === 0 ? null : comentario,
      ),
    z.null(),
  ])

const comentarioCriterioSchema = z
  .object({
    criterioId: z.uuid(
      'O identificador do critério é inválido.',
    ),
    comentario: z
      .string()
      .trim()
      .min(
        1,
        'O comentário do critério não pode estar vazio.',
      )
      .max(
        5000,
        'O comentário do critério deve possuir no máximo 5000 caracteres.',
      ),
  })
  .strict()

const notaCompetenciaSchema = z
  .number()
  .int('A nota da competência deve ser um número inteiro.')
  .min(0, 'A nota mínima da competência é 0.')
  .max(200, 'A nota máxima da competência é 200.')
  .nullable()

export const feedbackParamsSchema = z
  .object({
    redacaoId: z.uuid(
      'O identificador da redação é inválido.',
    ),
  })
  .strict()

export const salvarFeedbackRascunhoSchema = z
  .object({
    competencia1: notaCompetenciaSchema,
    competencia2: notaCompetenciaSchema,
    competencia3: notaCompetenciaSchema,
    competencia4: notaCompetenciaSchema,
    competencia5: notaCompetenciaSchema,
    comentarioGeral: comentarioOpcional,
    criterios: z
      .array(comentarioCriterioSchema)
      .max(
        10,
        'O feedback pode possuir no máximo 10 comentários por critério.',
      ),
  })
  .strict()
  .superRefine((dados, contexto) => {
    const criteriosEncontrados = new Set()

    dados.criterios.forEach((criterio, indice) => {
      if (criteriosEncontrados.has(criterio.criterioId)) {
        contexto.addIssue({
          code: 'custom',
          path: [
            'criterios',
            indice,
            'criterioId',
          ],
          message:
            'Um critério não pode aparecer mais de uma vez no feedback.',
        })
      }

      criteriosEncontrados.add(criterio.criterioId)
    })
  })
