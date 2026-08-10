import { Buffer } from 'node:buffer'

import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido.')
  .max(191, 'O e-mail deve possuir no máximo 191 caracteres.')

const senhaCadastroSchema = z
  .string()
  .min(10, 'A senha deve possuir pelo menos 10 caracteres.')
  .max(72, 'A senha deve possuir no máximo 72 caracteres.')
  .regex(
    /[a-z]/,
    'A senha deve possuir pelo menos uma letra minúscula.',
  )
  .regex(
    /[A-Z]/,
    'A senha deve possuir pelo menos uma letra maiúscula.',
  )
  .regex(
    /\d/,
    'A senha deve possuir pelo menos um número.',
  )
  .refine(
    (senha) => Buffer.byteLength(senha, 'utf8') <= 72,
    'A senha deve possuir no máximo 72 bytes.',
  )

const senhaLoginSchema = z
  .string()
  .min(1, 'Informe a senha.')
  .refine(
    (senha) => Buffer.byteLength(senha, 'utf8') <= 72,
    'A senha informada é muito longa.',
  )

export const cadastroSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, 'O nome deve possuir pelo menos 2 caracteres.')
      .max(120, 'O nome deve possuir no máximo 120 caracteres.')
      .transform((nome) => nome.replace(/\s+/g, ' ')),

    email: emailSchema,

    senha: senhaCadastroSchema,

    papel: z.enum(['PROFESSOR', 'ALUNO'], {
      error: 'O papel deve ser PROFESSOR ou ALUNO.',
    }),
  })
  .strict()

export const loginSchema = z
  .object({
    email: emailSchema,

    senha: senhaLoginSchema,
  })
  .strict()