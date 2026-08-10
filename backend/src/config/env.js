import 'dotenv/config'
import { z } from 'zod'

const segredoJwt = z
  .string()
  .length(128, 'deve possuir exatamente 128 caracteres')
  .regex(
    /^[0-9a-f]+$/,
    'deve conter somente caracteres hexadecimais minúsculos',
  )

const duracaoJwt = z
  .string()
  .regex(
    /^[1-9]\d*[smhd]$/,
    'deve usar um número seguido por s, m, h ou d',
  )

const chaveOpcional = z.preprocess(
  (valor) =>
    typeof valor === 'string' && valor.trim() === ''
      ? undefined
      : valor,
  z.string().trim().min(8).optional(),
)

const booleanoEnv = z
  .enum(['true', 'false'])
  .default('false')
  .transform((valor) => valor === 'true')

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    HOST: z.string().min(1).default('127.0.0.1'),

    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    FRONTEND_URL: z.string().url(),

    DATABASE_URL: z.string().url(),

    TEST_DATABASE_URL: z.string().url().optional(),

    JWT_ACCESS_SECRET: segredoJwt,

    JWT_REFRESH_SECRET: segredoJwt,

    JWT_ACCESS_EXPIRES_IN: duracaoJwt,

    JWT_REFRESH_EXPIRES_IN: duracaoJwt,

    BCRYPT_ROUNDS: z.coerce
      .number()
      .int()
      .min(10)
      .max(14)
      .default(12),

    OCR_SPACE_API_KEY: chaveOpcional,

    OCR_SPACE_API_URL: z
      .string()
      .url()
      .refine(
        (url) => url.startsWith('https://'),
        'deve utilizar HTTPS',
      )
      .default('https://api.ocr.space/parse/image'),

    OCR_SPACE_ENGINE: z.coerce
      .number()
      .int()
      .min(1)
      .max(3)
      .default(3),

    OCR_SPACE_LANGUAGE: z
      .enum(['por', 'auto'])
      .default('por'),

    OCR_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(5000)
      .max(120000)
      .default(60000),

    OCR_MAX_FILE_SIZE_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(1048576)
      .default(1048576),

    GEMINI_API_KEY: chaveOpcional,

    GEMINI_MODEL: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default('gemini-3.6-flash'),

    GEMINI_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(10000)
      .max(180000)
      .default(120000),

    EMAIL_ENABLED: booleanoEnv,

    RESEND_API_KEY: chaveOpcional,

    RESEND_FROM: z
      .string()
      .trim()
      .min(3)
      .max(191)
      .default('LÉXIS <onboarding@resend.dev>'),

    EMAIL_DEMO_RECIPIENT: z.preprocess(
      (valor) =>
        typeof valor === 'string' && valor.trim() === ''
          ? undefined
          : valor,
      z.email().optional(),
    ),

    EMAIL_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .default(3),

    EMAIL_RETRY_DELAY_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(86400000)
      .default(60000),

    EMAIL_BATCH_SIZE: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10),
  })
  .superRefine((variaveis, contexto) => {
    if (
      variaveis.JWT_ACCESS_SECRET ===
      variaveis.JWT_REFRESH_SECRET
    ) {
      contexto.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'deve ser diferente de JWT_ACCESS_SECRET',
      })
    }

    if (
      variaveis.NODE_ENV === 'test' &&
      !variaveis.TEST_DATABASE_URL
    ) {
      contexto.addIssue({
        code: 'custom',
        path: ['TEST_DATABASE_URL'],
        message: 'é obrigatória no ambiente de teste',
      })
    }

    if (
      variaveis.NODE_ENV !== 'test' &&
      !variaveis.OCR_SPACE_API_KEY
    ) {
      contexto.addIssue({
        code: 'custom',
        path: ['OCR_SPACE_API_KEY'],
        message: 'é obrigatória fora do ambiente de teste',
      })
    }

    if (
      variaveis.NODE_ENV !== 'test' &&
      !variaveis.GEMINI_API_KEY
    ) {
      contexto.addIssue({
        code: 'custom',
        path: ['GEMINI_API_KEY'],
        message: 'é obrigatória fora do ambiente de teste',
      })
    }

    if (
      variaveis.NODE_ENV !== 'test' &&
      variaveis.EMAIL_ENABLED &&
      !variaveis.RESEND_API_KEY
    ) {
      contexto.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message:
          'é obrigatória quando EMAIL_ENABLED=true',
      })
    }

    if (
      variaveis.NODE_ENV !== 'test' &&
      variaveis.EMAIL_ENABLED &&
      variaveis.NODE_ENV !== 'production' &&
      !variaveis.EMAIL_DEMO_RECIPIENT
    ) {
      contexto.addIssue({
        code: 'custom',
        path: ['EMAIL_DEMO_RECIPIENT'],
        message:
          'é obrigatório para o envio de demonstração',
      })
    }
  })

const resultado = envSchema.safeParse(process.env)

if (!resultado.success) {
  const detalhes = resultado.error.issues
    .map((erro) => `${erro.path.join('.')}: ${erro.message}`)
    .join('; ')

  throw new Error(`Variáveis de ambiente inválidas: ${detalhes}`)
}

export const env = resultado.data
