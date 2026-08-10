import { z } from 'zod'

const nomeTurmaSchema = z
  .string()
  .trim()
  .min(
    2,
    'O nome da turma deve possuir pelo menos 2 caracteres.',
  )
  .max(
    100,
    'O nome da turma deve possuir no máximo 100 caracteres.',
  )
  .transform((nome) => nome.replace(/\s+/g, ' '))

const codigoAcessoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(
    8,
    'O código de acesso deve possuir 8 caracteres.',
  )
  .regex(
    /^[A-HJ-NP-Z2-9]{8}$/,
    'O código de acesso informado é inválido.',
  )

export const criarTurmaSchema = z
  .object({
    nome: nomeTurmaSchema,
  })
  .strict()

export const atualizarTurmaSchema = z
  .object({
    nome: nomeTurmaSchema,
  })
  .strict()

export const entrarTurmaSchema = z
  .object({
    codigoAcesso: codigoAcessoSchema,
  })
  .strict()

export const turmaParamsSchema = z
  .object({
    turmaId: z.uuid(
      'O identificador da turma é inválido.',
    ),
  })
  .strict()
  
  export const turmaAlunoParamsSchema = z
  .object({
    turmaId: z.uuid(
      'O identificador da turma é inválido.',
    ),

    alunoId: z.uuid(
      'O identificador do aluno é inválido.',
    ),
  })
  .strict()