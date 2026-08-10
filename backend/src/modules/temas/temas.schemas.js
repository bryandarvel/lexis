import { z } from 'zod'

const textoCurto = (campo, minimo, maximo) =>
  z
    .string()
    .trim()
    .min(
      minimo,
      `${campo} deve possuir pelo menos ${minimo} caracteres.`,
    )
    .max(
      maximo,
      `${campo} deve possuir no máximo ${maximo} caracteres.`,
    )
    .transform((texto) => texto.replace(/\s+/g, ' '))

const descricaoSchema = z
  .string()
  .trim()
  .min(
    10,
    'A descrição deve possuir pelo menos 10 caracteres.',
  )
  .max(
    10000,
    'A descrição deve possuir no máximo 10000 caracteres.',
  )

const instrucoesSchema = z
  .string()
  .trim()
  .max(
    5000,
    'As instruções devem possuir no máximo 5000 caracteres.',
  )
  .transform((instrucoes) =>
    instrucoes.length === 0 ? null : instrucoes,
  )

const prazoEntregaSchema = z
  .iso
  .datetime({
    offset: true,
    error:
      'Informe o prazo de entrega em um formato de data e hora válido.',
  })
  .transform((prazo) => new Date(prazo))

const criterioSchema = z
  .object({
    nome: textoCurto(
      'O nome do critério',
      2,
      120,
    ),

    descricao: z
      .string()
      .trim()
      .min(
        5,
        'A descrição do critério deve possuir pelo menos 5 caracteres.',
      )
      .max(
        2000,
        'A descrição do critério deve possuir no máximo 2000 caracteres.',
      ),
  })
  .strict()

const criteriosSchema = z
  .array(criterioSchema)
  .min(
    1,
    'Informe pelo menos um critério de avaliação.',
  )
  .max(
    10,
    'Um tema pode possuir no máximo 10 critérios.',
  )
  .superRefine((criterios, contexto) => {
    const nomesEncontrados = new Set()

    criterios.forEach((criterio, indice) => {
      const nomeNormalizado =
        criterio.nome.toLocaleLowerCase('pt-BR')

      if (nomesEncontrados.has(nomeNormalizado)) {
        contexto.addIssue({
          code: 'custom',
          path: [indice, 'nome'],
          message:
            'Os critérios não podem possuir nomes repetidos.',
        })
      }

      nomesEncontrados.add(nomeNormalizado)
    })
  })

export const criarTemaSchema = z
  .object({
    enunciado: textoCurto(
      'O enunciado',
      5,
      250,
    ),

    descricao: descricaoSchema,

    instrucoes: instrucoesSchema.optional(),

    prazoEntrega: prazoEntregaSchema,

    criterios: criteriosSchema,
  })
  .strict()

export const atualizarTemaSchema = z
  .object({
    enunciado: textoCurto(
      'O enunciado',
      5,
      250,
    ).optional(),

    descricao: descricaoSchema.optional(),

    instrucoes: z
      .union([
        instrucoesSchema,
        z.null(),
      ])
      .optional(),

    prazoEntrega: prazoEntregaSchema.optional(),
  })
  .strict()
  .refine(
    (dados) =>
      Object.values(dados).some(
        (valor) => valor !== undefined,
      ),
    {
      message:
        'Informe pelo menos um campo para atualização.',
    },
  )

export const substituirCriteriosSchema = z
  .object({
    criterios: criteriosSchema,
  })
  .strict()

export const turmaTemaParamsSchema = z
  .object({
    turmaId: z.uuid(
      'O identificador da turma é inválido.',
    ),
  })
  .strict()

export const temaParamsSchema = z
  .object({
    temaId: z.uuid(
      'O identificador do tema é inválido.',
    ),
  })
  .strict()