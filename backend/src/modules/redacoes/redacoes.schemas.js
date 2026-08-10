import { z } from 'zod'

const textoRedacaoSchema = z
  .string()
  .trim()
  .min(
    1,
    'O texto da redação não pode estar vazio.',
  )
  .max(
    20000,
    'O texto da redação deve possuir no máximo 20000 caracteres.',
  )

export const salvarRascunhoSchema = z
  .object({
    texto: textoRedacaoSchema,
  })
  .strict()

export const temaRedacaoParamsSchema = z
  .object({
    temaId: z.uuid(
      'O identificador do tema é inválido.',
    ),
  })
  .strict()

export const redacaoParamsSchema = z
  .object({
    redacaoId: z.uuid(
      'O identificador da redação é inválido.',
    ),
  })
  .strict()

export const turmaRedacoesParamsSchema = z
  .object({
    turmaId: z.uuid(
      'O identificador da turma é inválido.',
    ),
  })
  .strict()

export const listarRedacoesTurmaQuerySchema = z
  .object({
    temaId: z
      .uuid(
        'O identificador do tema é inválido.',
      )
      .optional(),

    status: z
      .enum([
        'ENVIADA',
        'AVALIADA',
      ])
      .optional(),
  })
  .strict()