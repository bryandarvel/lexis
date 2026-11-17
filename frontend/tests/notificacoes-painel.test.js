import assert from 'node:assert/strict'
import test from 'node:test'

import {
  descreverContagemDoPainel,
  LIMITE_AVISOS_NO_PAINEL,
  obterContextoDoAviso,
  selecionarAvisosRecentes,
} from '../src/utils/notificacoes-painel.js'

function aviso(id, criadaEm) {
  return { id: String(id), criadaEm, lidaEm: null }
}

test('o painel mostra no máximo dez avisos, do mais novo para o mais antigo', () => {
  const avisos = Array.from({ length: 14 }, (_, indice) =>
    aviso(indice, new Date(2026, 10, indice + 1).toISOString()),
  )

  const recentes = selecionarAvisosRecentes(avisos)

  assert.equal(LIMITE_AVISOS_NO_PAINEL, 10)
  assert.equal(recentes.length, 10)
  assert.equal(recentes[0].id, '13')
  assert.equal(recentes[9].id, '4')
})

test('ordena por criadaEm mesmo quando a lista chega fora de ordem e não muda a original', () => {
  const avisos = [
    aviso('antigo', '2026-11-01T10:00:00.000Z'),
    aviso('novo', '2026-11-10T10:00:00.000Z'),
    aviso('meio', '2026-11-05T10:00:00.000Z'),
  ]

  assert.deepEqual(
    selecionarAvisosRecentes(avisos).map((item) => item.id),
    ['novo', 'meio', 'antigo'],
  )
  assert.equal(avisos[0].id, 'antigo')
})

test('lista ausente ou inválida vira lista vazia', () => {
  assert.deepEqual(selecionarAvisosRecentes(undefined), [])
  assert.deepEqual(selecionarAvisosRecentes(null), [])
  assert.deepEqual(selecionarAvisosRecentes({}), [])
})

test('o contexto vem de redacao.tema: proposta e turma', () => {
  const contexto = obterContextoDoAviso({
    redacao: {
      tema: {
        enunciado: '  Desafios da educação digital  ',
        turma: { id: 't1', nome: '3º A' },
      },
    },
  })

  assert.deepEqual(contexto, {
    proposta: 'Desafios da educação digital',
    turma: '3º A',
  })
})

test('aviso sem redação não tem contexto', () => {
  assert.deepEqual(obterContextoDoAviso({ redacao: null }), {
    proposta: null,
    turma: null,
  })
  assert.deepEqual(obterContextoDoAviso(undefined), {
    proposta: null,
    turma: null,
  })
  assert.deepEqual(
    obterContextoDoAviso({ redacao: { tema: { enunciado: '   ', turma: {} } } }),
    { proposta: null, turma: null },
  )
})

test('a contagem do cabeçalho do painel é texto', () => {
  assert.equal(descreverContagemDoPainel(0), 'Nenhum aviso não lido')
  assert.equal(descreverContagemDoPainel(1), '1 não lido')
  assert.equal(descreverContagemDoPainel(12), '12 não lidos')
  assert.equal(descreverContagemDoPainel(undefined), 'Nenhum aviso não lido')
  assert.equal(descreverContagemDoPainel(-3), 'Nenhum aviso não lido')
})
