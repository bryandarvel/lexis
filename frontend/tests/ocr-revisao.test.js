import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  descartarRevisaoOcr,
  guardarRevisaoOcr,
  obterRevisaoOcr,
} from '../src/services/revisao-ocr-pendente.js'
import {
  descreverArquivo,
  descreverEtapaAtual,
  formatarTamanhoArquivo,
  mensagemErroRevisaoOcr,
  PASSOS_ENVIO_FOTO,
} from '../src/utils/ocr-revisao.js'

afterEach(() => {
  descartarRevisaoOcr()
})

test('guarda a revisão pendente somente para o aluno e a proposta corretos', () => {
  guardarRevisaoOcr({
    usuarioId: 'aluno-1',
    temaId: 'tema-1',
    textoExtraido: 'Texto fictício transcrito.',
    textoAnterior: 'Rascunho anterior.',
  })

  assert.equal(
    obterRevisaoOcr({
      usuarioId: 'aluno-1',
      temaId: 'tema-1',
    })?.textoExtraido,
    'Texto fictício transcrito.',
  )
  assert.equal(
    obterRevisaoOcr({
      usuarioId: 'aluno-2',
      temaId: 'tema-1',
    }),
    null,
  )
  assert.equal(
    obterRevisaoOcr({
      usuarioId: 'aluno-1',
      temaId: 'tema-2',
    }),
    null,
  )
})

test('mantém uma revisão por vez e permite descartá-la', () => {
  guardarRevisaoOcr({
    usuarioId: 'aluno-1',
    temaId: 'tema-1',
    textoExtraido: 'Primeira foto.',
  })
  guardarRevisaoOcr({
    usuarioId: 'aluno-1',
    temaId: 'tema-2',
    textoExtraido: 'Segunda foto.',
  })

  assert.equal(
    obterRevisaoOcr({
      usuarioId: 'aluno-1',
      temaId: 'tema-1',
    }),
    null,
  )
  assert.equal(
    obterRevisaoOcr({
      usuarioId: 'aluno-1',
      temaId: 'tema-2',
    })?.textoAnterior,
    '',
  )

  descartarRevisaoOcr()

  assert.equal(
    obterRevisaoOcr({
      usuarioId: 'aluno-1',
      temaId: 'tema-2',
    }),
    null,
  )
})

test('recusa guardar uma revisão incompleta', () => {
  assert.throws(
    () =>
      guardarRevisaoOcr({
        usuarioId: 'aluno-1',
        temaId: 'tema-1',
      }),
    TypeError,
  )
})

test('descreve o arquivo enviado com nome e tamanho', () => {
  assert.equal(formatarTamanhoArquivo(37 * 1024), '37 KB')
  assert.equal(formatarTamanhoArquivo(200), '1 KB')
  assert.equal(
    formatarTamanhoArquivo(2.4 * 1024 * 1024),
    '2,4 MB',
  )
  assert.equal(formatarTamanhoArquivo(undefined), '')
  assert.equal(
    descreverArquivo({
      name: 'redacao.jpg',
      size: 37 * 1024,
    }),
    'redacao.jpg · 37 KB',
  )
  assert.equal(descreverArquivo(null), '')
})

test('explica a falha ao salvar com a mensagem mais específica disponível', () => {
  assert.match(
    mensagemErroRevisaoOcr(new Error('Network Error')),
    /conectar ao servidor/,
  )
  assert.equal(
    mensagemErroRevisaoOcr({
      response: {
        data: {
          error: {
            message: 'Dados de entrada inválidos.',
            details: [
              {
                field: 'texto',
                message:
                  'O texto da redação não pode estar vazio.',
              },
            ],
          },
        },
      },
    }),
    'O texto da redação não pode estar vazio.',
  )
  assert.equal(
    mensagemErroRevisaoOcr({
      response: {
        data: {
          error: {
            message:
              'A redação já foi enviada e não pode mais ser alterada ou reenviada.',
          },
        },
      },
    }),
    'A redação já foi enviada e não pode mais ser alterada ou reenviada.',
  )
})

test('lista as quatro etapas do envio por foto com a revisão como atual', () => {
  assert.deepEqual(
    PASSOS_ENVIO_FOTO.map((passo) => passo.estado),
    ['concluido', 'concluido', 'atual', 'pendente'],
  )
})

test('deriva o rótulo da etapa atual da posição e do total da lista', () => {
  assert.equal(descreverEtapaAtual(), 'Etapa 3 de 4')
  assert.equal(
    descreverEtapaAtual([
      { estado: 'concluido' },
      { estado: 'atual' },
    ]),
    'Etapa 2 de 2',
  )
  assert.equal(
    descreverEtapaAtual([{ estado: 'concluido' }]),
    null,
  )
})
