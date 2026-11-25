import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  obterDesempenhoParaAluno,
} from '../../src/modules/desempenho/desempenho.service.js'

describe('Serviço de desempenho do aluno', () => {
  it('deve consultar somente o aluno informado', async () => {
    let dadosRecebidos

    await obterDesempenhoParaAluno(
      {
        alunoId: 'aluno-1',
      },
      {
        buscar: async (dados) => {
          dadosRecebidos = dados

          return {
            mediaNota: null,
            mediaCompetencia2: null,
            ultimaNota: null,
            totalEnviadas: 0,
            totalCorrigidas: 0,
          }
        },
      },
    )

    assert.deepEqual(dadosRecebidos, {
      alunoId: 'aluno-1',
    })
  })

  it('deve retornar médias nulas, e não zero, sem correção publicada', async () => {
    const resultado = await obterDesempenhoParaAluno(
      {
        alunoId: 'aluno-1',
      },
      {
        buscar: async () => ({
          mediaNota: null,
          mediaCompetencia2: null,
          ultimaNota: null,
          totalEnviadas: 2,
          totalCorrigidas: 0,
        }),
      },
    )

    assert.deepEqual(resultado, {
      mediaGeral: null,
      ultimaNota: null,
      mediaCompetencia2: null,
      totalEnviadas: 2,
      totalCorrigidas: 0,
    })
  })

  it('deve calcular médias com uma casa decimal e manter a última nota', async () => {
    const resultado = await obterDesempenhoParaAluno(
      {
        alunoId: 'aluno-1',
      },
      {
        buscar: async () => ({
          mediaNota: 833.3333333,
          mediaCompetencia2: 146.6666667,
          ultimaNota: 880,
          totalEnviadas: 4,
          totalCorrigidas: 3,
        }),
      },
    )

    assert.deepEqual(resultado, {
      mediaGeral: 833.3,
      ultimaNota: 880,
      mediaCompetencia2: 146.7,
      totalEnviadas: 4,
      totalCorrigidas: 3,
    })
  })

  it('deve recusar um resultado fora do contrato', async () => {
    await assert.rejects(() =>
      obterDesempenhoParaAluno(
        {
          alunoId: 'aluno-1',
        },
        {
          buscar: async () => ({
            mediaNota: 1200,
            mediaCompetencia2: 150,
            ultimaNota: 880,
            totalEnviadas: 1,
            totalCorrigidas: 1,
          }),
        },
      ),
    )
  })
})
