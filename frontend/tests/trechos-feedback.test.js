import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LIMITE_TRECHOS_POR_CRITERIO,
  criarTrechoDaSelecao,
  montarCriterioParaEnvio,
  montarTrechosParaEnvio,
  podeAcrescentarTrecho,
  validarTrechosRecebidos,
} from '../src/utils/trechos-feedback.js'

const TEXTO = 'A educação midiática exige repertório. Veja o caso de 2019.'

test('a seleção vira um trecho com os offsets e o texto literal', () => {
  const { trecho, erro } = criarTrechoDaSelecao(TEXTO, 2, 20)

  assert.equal(erro, '')
  assert.deepEqual(trecho, { inicio: 2, fim: 20, trecho: 'educação midiática' })
  assert.equal(TEXTO.slice(trecho.inicio, trecho.fim), trecho.trecho)
})

test('seleção vazia, invertida ou fora do texto é recusada', () => {
  for (const [inicio, fim] of [[5, 5], [10, 4], [-1, 5], [0, TEXTO.length + 1], [TEXTO.length, TEXTO.length]]) {
    const { trecho, erro } = criarTrechoDaSelecao(TEXTO, inicio, fim)

    assert.equal(trecho, null)
    assert.ok(erro)
  }
})

test('offsets não inteiros ou texto ausente são recusados', () => {
  assert.equal(criarTrechoDaSelecao(TEXTO, 1.5, 4).trecho, null)
  assert.equal(criarTrechoDaSelecao(TEXTO, '1', 4).trecho, null)
  assert.equal(criarTrechoDaSelecao('', 0, 1).trecho, null)
  assert.equal(criarTrechoDaSelecao(null, 0, 1).trecho, null)
})

// O backend exige texto.slice(inicio, fim) === trecho, sem aparar nem normalizar.
test('acentos, emoji e quebra de linha são preservados sem normalizar', () => {
  const texto = 'Ação é 🌍 global.\nSegunda linha com ç.'

  for (const [inicio, fim] of [[0, 5], [7, 9], [16, 24], [0, texto.length]]) {
    const { trecho } = criarTrechoDaSelecao(texto, inicio, fim)

    assert.equal(texto.slice(trecho.inicio, trecho.fim), trecho.trecho)
  }

  // O emoji ocupa duas unidades UTF-16: cortar ao meio é recusado.
  const meioDoEmoji = criarTrechoDaSelecao(texto, 7, 8)

  assert.equal(meioDoEmoji.trecho, null)
  assert.match(meioDoEmoji.erro, /caractere/i)
})

test('espaço nas bordas é mantido, porque o servidor compara literalmente', () => {
  const { trecho } = criarTrechoDaSelecao(TEXTO, 1, 11)

  assert.equal(trecho.trecho, ' educação ')
  assert.equal(TEXTO.slice(trecho.inicio, trecho.fim), trecho.trecho)
})

test('duplicata do mesmo intervalo no mesmo critério é recusada', () => {
  const existentes = [{ inicio: 2, fim: 20, trecho: 'educação midiática' }]
  const igual = { inicio: 2, fim: 20, trecho: 'educação midiática' }

  assert.match(podeAcrescentarTrecho(existentes, igual), /mesmo trecho|já/i)
  // Intervalo sobreposto, mas diferente, é permitido.
  assert.equal(podeAcrescentarTrecho(existentes, { inicio: 2, fim: 11, trecho: 'educação ' }), '')
  assert.equal(podeAcrescentarTrecho([], igual), '')
})

test('passar de vinte trechos no mesmo critério é recusado', () => {
  assert.equal(LIMITE_TRECHOS_POR_CRITERIO, 20)

  const cheios = Array.from({ length: 20 }, (_, i) => ({ inicio: i, fim: i + 1, trecho: 'x' }))

  assert.match(podeAcrescentarTrecho(cheios, { inicio: 50, fim: 52, trecho: 'ab' }), /20/)
  assert.equal(podeAcrescentarTrecho(cheios.slice(0, 19), { inicio: 50, fim: 52, trecho: 'ab' }), '')
})

test('o envio carrega só os campos aceitos pela API', () => {
  const comExtras = [
    { id: 'reg-1', inicio: 2, fim: 20, trecho: 'educação midiática', sugeridoPorIa: true, analiseIaId: '2222', diagnostico: 'privado' },
    { inicio: 39, fim: 43, trecho: 'Veja' },
  ]
  const enviado = montarTrechosParaEnvio(comExtras)

  assert.deepEqual(enviado, [
    { inicio: 2, fim: 20, trecho: 'educação midiática', analiseIaId: '2222' },
    { inicio: 39, fim: 43, trecho: 'Veja' },
  ])

  for (const item of enviado) {
    for (const proibido of ['id', 'sugeridoPorIa', 'diagnostico']) {
      assert.equal(proibido in item, false)
    }
  }
})

test('analiseIaId só vai quando existe, e nunca como null', () => {
  const enviado = montarTrechosParaEnvio([
    { inicio: 0, fim: 1, trecho: 'A', analiseIaId: null },
    { inicio: 1, fim: 2, trecho: ' ', analiseIaId: '' },
  ])

  assert.deepEqual(enviado, [
    { inicio: 0, fim: 1, trecho: 'A' },
    { inicio: 1, fim: 2, trecho: ' ' },
  ])
})

// Omitir preserva o que já estava salvo; [] limpa de propósito.
test('o critério não mexido vai sem a chave trechos', () => {
  const item = montarCriterioParaEnvio({
    criterioId: 'c1',
    comentario: ' Comentário ',
    trechos: [{ inicio: 0, fim: 1, trecho: 'A' }],
    alterado: false,
  })

  assert.deepEqual(item, { criterioId: 'c1', comentario: 'Comentário' })
  assert.equal('trechos' in item, false)
})

test('o critério mexido vai com a lista, e limpo vai com lista vazia', () => {
  const comTrechos = montarCriterioParaEnvio({
    criterioId: 'c1',
    comentario: 'Comentário',
    trechos: [{ inicio: 0, fim: 1, trecho: 'A' }],
    alterado: true,
  })

  assert.deepEqual(comTrechos.trechos, [{ inicio: 0, fim: 1, trecho: 'A' }])

  const limpo = montarCriterioParaEnvio({
    criterioId: 'c1',
    comentario: 'Comentário',
    trechos: [],
    alterado: true,
  })

  assert.deepEqual(limpo.trechos, [])
})

test('trechos do servidor que não batem com o texto são descartados', () => {
  const recebidos = [
    { id: 'a', inicio: 2, fim: 20, trecho: 'educação midiática' },
    { id: 'b', inicio: 2, fim: 20, trecho: 'outro texto' },
    { id: 'c', inicio: 0, fim: 9999, trecho: 'fora do texto' },
    { id: 'd', inicio: -1, fim: 4, trecho: 'A ed' },
    { id: 'e', inicio: 5, fim: 5, trecho: '' },
    null,
    { id: 'f', inicio: 39, fim: 43, trecho: 'Veja' },
  ]
  const validos = validarTrechosRecebidos(TEXTO, recebidos)

  assert.deepEqual(validos.map((t) => t.id), ['a', 'f'])
  assert.deepEqual(validarTrechosRecebidos(TEXTO, undefined), [])
  assert.deepEqual(validarTrechosRecebidos('', [{ inicio: 0, fim: 1, trecho: 'A' }]), [])
})

test('a lista validada sai ordenada por início e preserva os campos recebidos', () => {
  const validos = validarTrechosRecebidos(TEXTO, [
    { id: 'f', inicio: 39, fim: 43, trecho: 'Veja', sugeridoPorIa: true },
    { id: 'a', inicio: 2, fim: 20, trecho: 'educação midiática', sugeridoPorIa: false },
  ])

  assert.deepEqual(validos.map((t) => t.id), ['a', 'f'])
  assert.equal(validos[0].sugeridoPorIa, false)
})

test('offset acima do limite do servidor é recusado', () => {
  const longo = 'a'.repeat(20005)

  assert.equal(criarTrechoDaSelecao(longo, 0, 20001).trecho, null)
  assert.equal(criarTrechoDaSelecao(longo, 19999, 20000).erro, '')
})
