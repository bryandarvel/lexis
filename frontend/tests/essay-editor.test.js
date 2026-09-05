import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aplicarSugestaoLinguistica,
  calcularProgressoUpload,
  encontrarRedacaoPorTema,
  LIMITE_IMAGEM_REDACAO_BYTES,
  precisaConfirmarSubstituicaoOcr,
  validarImagemRedacao,
} from '../src/utils/essay-editor.js'

test('encontra a redação do tema sem alterar a coleção', () => {
  const redacoes = [
    { id: 'r1', temaId: 'tema-1' },
    { id: 'r2', temaId: 'tema-2' },
  ]

  assert.equal(
    encontrarRedacaoPorTema(redacoes, 'tema-2'),
    redacoes[1],
  )
  assert.equal(
    encontrarRedacaoPorTema(redacoes, 'tema-3'),
    null,
  )
  assert.equal(encontrarRedacaoPorTema(null, 'tema-1'), null)
})

test('valida formato e limite da imagem de redação', () => {
  assert.equal(
    validarImagemRedacao(null),
    'Selecione uma imagem JPEG ou PNG.',
  )
  assert.equal(
    validarImagemRedacao({
      type: 'application/pdf',
      size: 200,
    }),
    'Utilize uma imagem JPEG ou PNG.',
  )
  assert.equal(
    validarImagemRedacao({
      type: 'image/png',
      size: LIMITE_IMAGEM_REDACAO_BYTES + 1,
    }),
    'A imagem deve possuir no máximo 1 MB.',
  )
  assert.equal(
    validarImagemRedacao({
      type: 'image/jpeg',
      size: LIMITE_IMAGEM_REDACAO_BYTES,
    }),
    null,
  )
})

test('calcula progresso de upload dentro do intervalo de 0 a 100', () => {
  assert.equal(calcularProgressoUpload(25, 100), 25)
  assert.equal(calcularProgressoUpload(120, 100), 100)
  assert.equal(calcularProgressoUpload(-5, 100), 0)
  assert.equal(calcularProgressoUpload(1, 0), null)
  assert.equal(calcularProgressoUpload(1, undefined), null)
})

test('pede confirmação antes de substituir conteúdo existente pelo OCR', () => {
  assert.equal(precisaConfirmarSubstituicaoOcr('  texto  '), true)
  assert.equal(precisaConfirmarSubstituicaoOcr('   '), false)
  assert.equal(precisaConfirmarSubstituicaoOcr(undefined), false)
})

test('aplica sugestão somente quando os offsets ainda correspondem ao texto', () => {
  const sugestao = {
    inicio: 8,
    fim: 11,
    trecho: 'vim',
  }

  assert.equal(
    aplicarSugestaoLinguistica(
      'Ele vai vim amanhã.',
      sugestao,
      'vir',
    ),
    'Ele vai vir amanhã.',
  )
  assert.equal(
    aplicarSugestaoLinguistica(
      'O texto já mudou.',
      sugestao,
      'vir',
    ),
    null,
  )
})
