import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  listarRedacoesParaAluno,
} from '../../src/modules/redacoes/redacoes.service.js'

describe('Listagem de redações do aluno', () => {
  it('deve expor a nota e a data da última versão publicada', async () => {
    const publicadoEm = new Date(
      '2026-08-05T12:00:00.000Z',
    )

    const [redacao] = await listarRedacoesParaAluno(
      'aluno-1',
      {
        listar: async () => [
          {
            id: 'redacao-1',
            status: 'AVALIADA',
            feedback: {
              versoes: [
                {
                  nota: 880,
                  publicadoEm,
                },
              ],
            },
          },
        ],
      },
    )

    assert.deepEqual(redacao, {
      id: 'redacao-1',
      status: 'AVALIADA',
      notaPublicada: 880,
      publicadoEm,
    })
  })

  it('deve retornar nulos quando não houver correção publicada', async () => {
    const redacoes = await listarRedacoesParaAluno(
      'aluno-1',
      {
        listar: async () => [
          {
            id: 'redacao-rascunho',
            status: 'RASCUNHO',
            feedback: null,
          },
          {
            id: 'redacao-em-correcao',
            status: 'ENVIADA',
            feedback: {
              versoes: [],
            },
          },
        ],
      },
    )

    assert.deepEqual(
      redacoes.map(
        ({
          id,
          notaPublicada,
          publicadoEm,
        }) => ({
          id,
          notaPublicada,
          publicadoEm,
        }),
      ),
      [
        {
          id: 'redacao-rascunho',
          notaPublicada: null,
          publicadoEm: null,
        },
        {
          id: 'redacao-em-correcao',
          notaPublicada: null,
          publicadoEm: null,
        },
      ],
    )
    assert.equal(
      redacoes.some((redacao) => 'feedback' in redacao),
      false,
    )
  })

  it('deve consultar somente o aluno informado', async () => {
    let alunoRecebido

    await listarRedacoesParaAluno('aluno-1', {
      listar: async (alunoId) => {
        alunoRecebido = alunoId
        return []
      },
    })

    assert.equal(alunoRecebido, 'aluno-1')
  })
})
