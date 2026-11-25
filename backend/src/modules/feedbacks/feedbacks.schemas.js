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

const trechoSchema = z.object({
  inicio: z.number().int().min(0).max(20000),
  fim: z.number().int().min(1).max(20000),
  // Não normalizar nem aparar: o texto precisa coincidir literalmente com a redação.
  trecho: z.string().min(1).max(20000),
  analiseIaId: z.uuid().optional(),
}).strict().refine(t => t.fim > t.inicio, { message: 'O fim deve ser posterior ao início.', path: ['fim'] })

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
    trechos: z.array(trechoSchema).max(20).optional(),
  })
  .strict()
  .superRefine((criterio, contexto) => {
    const intervalos = new Set()
    criterio.trechos?.forEach((trecho, indice) => {
      const chave = `${trecho.inicio}:${trecho.fim}`
      if (intervalos.has(chave)) contexto.addIssue({ code: 'custom', path: ['trechos', indice], message: 'O mesmo intervalo não pode se repetir no critério.' })
      intervalos.add(chave)
    })
  })

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
