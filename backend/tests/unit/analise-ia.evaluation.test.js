import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  compararEvidencias,
  resumirAvaliacoes,
} from '../../src/modules/avaliacao-ia/analise-ia.evaluation.js'

describe('Métricas da avaliação da IA', () => {
  it('deve comparar somente evidências localizadas e posicionadas', () => {
    const comparacao = compararEvidencias({
      resultado: {
        analisePorCriterio: [
          {
            ordem: 1,
            evidencias: [
              {
                inicio: 0,
                fim: 5,
                trecho: 'Texto',
                statusLocalizacao: 'LOCALIZADA',
              },
              {
                inicio: null,
                fim: null,
                trecho: 'Inventado',
                statusLocalizacao: 'NAO_LOCALIZADA',
              },
            ],
          },
        ],
      },
      referenciaHumana: {
        evidencias: [
          {
            criterioOrdem: 1,
            inicio: 0,
            fim: 5,
            trecho: 'Texto',
          },
          {
            criterioOrdem: 1,
            inicio: 6,
            fim: 10,
            trecho: 'real',
          },
        ],
      },
    })

    assert.deepEqual(comparacao, {
      verdadeirosPositivos: 1,
      falsosPositivos: 0,
      falsosNegativos: 1,
      ambiguas: 0,
      naoLocalizadas: 1,
    })
  })

  it('deve consolidar precisão, revocação, F1, falhas e latência', () => {
    const metricas = resumirAvaliacoes([
      {
        status: 'VALIDA',
        latenciaMs: 10,
        metricasEvidencias: {
          verdadeirosPositivos: 1,
          falsosPositivos: 0,
          falsosNegativos: 1,
          ambiguas: 0,
          naoLocalizadas: 1,
        },
      },
      {
        status: 'INVALIDA',
        latenciaMs: 30,
        metricasEvidencias: {
          verdadeirosPositivos: 0,
          falsosPositivos: 1,
          falsosNegativos: 0,
          ambiguas: 1,
          naoLocalizadas: 0,
        },
      },
    ])

    assert.equal(metricas.precisaoEvidencias, 0.5)
    assert.equal(metricas.revocacaoEvidencias, 0.5)
    assert.equal(metricas.f1Evidencias, 0.5)
    assert.equal(metricas.taxaRespostasInvalidas, 0.5)
    assert.equal(metricas.latenciaMediaMs, 20)
    assert.equal(metricas.concordanciaNotas.status, 'NAO_APLICAVEL')
  })
})
