import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classificarEvidencia,
  resumirEvidencias,
  segmentarTextoComEvidencias,
} from '../src/utils/ai-evidence.js'

test('segmenta o texto usando somente posições verificadas', () => {
  const texto = 'início trecho final'
  const criterios = [
    {
      ordem: 2,
      evidencias: [
        {
          trecho: 'trecho',
          inicio: 7,
          fim: 13,
          statusLocalizacao: 'LOCALIZADA',
        },
        {
          trecho: 'inventado',
          inicio: null,
          fim: null,
          statusLocalizacao: 'NAO_LOCALIZADA',
        },
      ],
    },
  ]

  assert.deepEqual(
    segmentarTextoComEvidencias(texto, criterios),
    [
      {
        inicio: 0,
        fim: 7,
        texto: 'início ',
        criterios: [],
      },
      {
        inicio: 7,
        fim: 13,
        texto: 'trecho',
        criterios: [2],
      },
      {
        inicio: 13,
        fim: 19,
        texto: ' final',
        criterios: [],
      },
    ],
  )
})

test('não marca posição cujo conteúdo diverge do texto', () => {
  const segmentos = segmentarTextoComEvidencias(
    'texto real',
    [
      {
        ordem: 1,
        evidencias: [
          {
            trecho: 'falso',
            inicio: 0,
            fim: 5,
            statusLocalizacao: 'LOCALIZADA',
          },
        ],
      },
    ],
  )

  assert.deepEqual(segmentos[0].criterios, [])
})

test('preserva sobreposição e associa mais de um critério ao trecho', () => {
  const texto = 'argumentação'
  const evidencia = {
    trecho: texto,
    inicio: 0,
    fim: texto.length,
    statusLocalizacao: 'LOCALIZADA',
  }
  const segmentos = segmentarTextoComEvidencias(
    texto,
    [
      { ordem: 1, evidencias: [evidencia] },
      { ordem: 3, evidencias: [evidencia] },
    ],
  )

  assert.deepEqual(segmentos[0].criterios, [1, 3])
})

test('classifica análises antigas e resume falhas de localização', () => {
  assert.equal(
    classificarEvidencia('Trecho antigo').status,
    'LEGADA',
  )

  assert.deepEqual(
    resumirEvidencias([
      {
        evidencias: [
          'Trecho antigo',
          { statusLocalizacao: 'LOCALIZADA' },
          { statusLocalizacao: 'AMBIGUA' },
          { statusLocalizacao: 'NAO_LOCALIZADA' },
        ],
      },
    ]),
    {
      localizadas: 1,
      ambiguas: 1,
      naoLocalizadas: 1,
      legadas: 1,
    },
  )
})
