import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import {
  atualizarTextoRevisaoOcr,
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
  revisaoPertenceA,
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

test('a revisão pertence somente ao aluno e à proposta que a criaram', () => {
  const revisao = { usuarioId: 'aluno-1', temaId: 'tema-1' }

  assert.equal(revisaoPertenceA(revisao, { usuarioId: 'aluno-1', temaId: 'tema-1' }), true)
  assert.equal(revisaoPertenceA(revisao, { usuarioId: 'aluno-2', temaId: 'tema-1' }), false)
  assert.equal(revisaoPertenceA(revisao, { usuarioId: 'aluno-1', temaId: 'tema-2' }), false)
  assert.equal(revisaoPertenceA(revisao, { usuarioId: undefined, temaId: 'tema-1' }), false)
  assert.equal(revisaoPertenceA(revisao, { usuarioId: 'aluno-1', temaId: '' }), false)
  assert.equal(revisaoPertenceA(revisao), false)
  assert.equal(revisaoPertenceA(null, { usuarioId: 'aluno-1', temaId: 'tema-1' }), false)
  assert.equal(
    revisaoPertenceA(
      { usuarioId: undefined, temaId: undefined },
      { usuarioId: undefined, temaId: undefined },
    ),
    false,
  )
})

test('preserva o texto editado para a remontagem da página, sem alterar a transcrição original', () => {
  guardarRevisaoOcr({
    usuarioId: 'aluno-1',
    temaId: 'tema-1',
    textoExtraido: 'Transcrição crua.',
  })

  assert.equal(
    obterRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1' }).textoRevisado,
    'Transcrição crua.',
  )
  assert.equal(
    atualizarTextoRevisaoOcr({
      usuarioId: 'aluno-1',
      temaId: 'tema-1',
      texto: 'Transcrição corrigida pelo aluno.',
    }),
    true,
  )

  // A página lê o store de novo ao ser montada: recebe a versão editada.
  const remontada = obterRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1' })

  assert.equal(remontada.textoRevisado, 'Transcrição corrigida pelo aluno.')
  assert.equal(remontada.textoExtraido, 'Transcrição crua.')
})

test('não deixa outro aluno ou outra proposta alterar o texto em revisão', () => {
  guardarRevisaoOcr({
    usuarioId: 'aluno-1',
    temaId: 'tema-1',
    textoExtraido: 'Original.',
  })

  assert.equal(
    atualizarTextoRevisaoOcr({ usuarioId: 'aluno-2', temaId: 'tema-1', texto: 'Intruso.' }),
    false,
  )
  assert.equal(
    atualizarTextoRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-2', texto: 'Outra proposta.' }),
    false,
  )
  assert.equal(
    atualizarTextoRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1', texto: null }),
    false,
  )
  assert.equal(
    obterRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1' }).textoRevisado,
    'Original.',
  )
})

test('descartar ou guardar outra foto encerra as edições da revisão anterior', () => {
  guardarRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1', textoExtraido: 'Primeira.' })
  atualizarTextoRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1', texto: 'Primeira editada.' })
  guardarRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1', textoExtraido: 'Segunda.' })

  assert.equal(
    obterRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1' }).textoRevisado,
    'Segunda.',
  )

  descartarRevisaoOcr()

  assert.equal(obterRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1' }), null)
  assert.equal(
    atualizarTextoRevisaoOcr({ usuarioId: 'aluno-1', temaId: 'tema-1', texto: 'Depois do descarte.' }),
    false,
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
