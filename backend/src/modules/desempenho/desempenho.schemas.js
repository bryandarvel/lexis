import { z } from 'zod'

const notaOuNulo = z
  .number()
  .min(0)
  .max(1000)
  .nullable()

const contagem = z
  .number()
  .int()
  .min(0)

export const desempenhoAlunoSchema = z
  .object({
    mediaGeral: notaOuNulo,
    ultimaNota: notaOuNulo,
    mediaCompetencia2: z
      .number()
      .min(0)
      .max(200)
      .nullable(),
    totalEnviadas: contagem,
    totalCorrigidas: contagem,
  })
  .strict()
