import { z } from 'zod'

export const notificacaoParamsSchema = z
  .object({
    notificacaoId: z.uuid(
      'O identificador da notificação é inválido.',
    ),
  })
  .strict()
