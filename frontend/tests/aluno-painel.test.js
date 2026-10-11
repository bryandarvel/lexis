import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  calcularPercentual,
  descreverRedacao,
  descreverTempoDesde,
  descreverTurma,
  encontrarRascunhoDoTema,
  formatarDiaMes,
  formatarIndicador,
  formatarPrazoEntrega,
  obterIniciais,
  selecionarPropostaAberta,
} from '../src/utils/aluno-painel.js'

const agora = new Date(2026, 7, 4, 10, 0)

function criarTema(id, prazoEntrega, enunciado = id) {
  return {
    id,
    enunciado,
    prazoEntrega: prazoEntrega.toISOString(),
  }
}

test('obtém as iniciais do primeiro e do último nome', () => {
  assert.equal(obterIniciais('maria eduarda souza'), 'MS')
  assert.equal(obterIniciais('Ana'), 'A')
  assert.equal(obterIniciais('  '), '?')
  assert.equal(obterIniciais(undefined), '?')
})

test('descreve a turma com o nome do professor', () => {
  assert.equal(
    descreverTurma({
      nome: '3ºA — Ensino Médio',
      professor: {
        nome: 'Ana Lima',
      },
    }),
    '3ºA — Ensino Médio · Prof. Ana Lima',
  )
  assert.equal(
    descreverTurma({
      nome: '3ºA',
    }),
    '3ºA',
  )
  assert.equal(descreverTurma(null), '')
})

test('escolhe a proposta aberta de prazo mais próximo ainda não entregue', () => {
  const temas = [
    criarTema('distante', new Date(2026, 7, 20)),
    criarTema('entregue', new Date(2026, 7, 5)),
    criarTema('encerrada', new Date(2026, 7, 3)),
    criarTema('proxima', new Date(2026, 7, 10)),
  ]
  const redacoes = [
    {
      temaId: 'entregue',
      status: 'ENVIADA',
    },
    {
      temaId: 'proxima',
      status: 'RASCUNHO',
    },
  ]

  assert.equal(
    selecionarPropostaAberta(temas, redacoes, agora)?.id,
    'proxima',
  )
})

test('não inventa proposta quando todas foram entregues ou encerradas', () => {
  const temas = [
    criarTema('corrigida', new Date(2026, 7, 10)),
    criarTema('encerrada', new Date(2026, 7, 1)),
  ]

  assert.equal(
    selecionarPropostaAberta(
      temas,
      [
        {
          temaId: 'corrigida',
          status: 'AVALIADA',
        },
      ],
      agora,
    ),
    null,
  )
  assert.equal(
    selecionarPropostaAberta(undefined, [], agora),
    null,
  )
})

test('encontra somente o rascunho do tema informado', () => {
  const redacoes = [
    {
      id: 'r1',
      temaId: 't1',
      status: 'ENVIADA',
    },
    {
      id: 'r2',
      temaId: 't2',
      status: 'RASCUNHO',
    },
  ]

  assert.equal(
    encontrarRascunhoDoTema(redacoes, 't2')?.id,
    'r2',
  )
  assert.equal(encontrarRascunhoDoTema(redacoes, 't1'), null)
})

test('formata o prazo e as datas curtas no padrão do protótipo', () => {
  assert.equal(
    formatarPrazoEntrega(
      new Date(2026, 7, 10, 23, 59).toISOString(),
    ),
    '10/08/2026, 23h59',
  )
  assert.equal(
    formatarPrazoEntrega('data inválida'),
    'Prazo indisponível',
  )
  assert.equal(
    formatarDiaMes(new Date(2026, 7, 5, 12).toISOString()),
    '05/08',
  )
  assert.equal(formatarDiaMes(null), null)
})

test('descreve há quanto tempo o rascunho foi salvo', () => {
  const minutosAtras = (minutos) =>
    new Date(agora.getTime() - minutos * 60_000)

  assert.equal(
    descreverTempoDesde(minutosAtras(0.5), agora),
    'agora há pouco',
  )
  assert.equal(
    descreverTempoDesde(minutosAtras(2), agora),
    'há 2 minutos',
  )
  assert.equal(
    descreverTempoDesde(minutosAtras(1), agora),
    'há 1 minuto',
  )
  assert.equal(
    descreverTempoDesde(minutosAtras(180), agora),
    'há 3 horas',
  )
  assert.equal(
    descreverTempoDesde(minutosAtras(60 * 24 * 2), agora),
    'há 2 dias',
  )
  assert.equal(descreverTempoDesde(null, agora), null)
})

test('descreve uma redação corrigida com nota publicada', () => {
  const descricao = descreverRedacao({
    id: 'r1',
    temaId: 't1',
    status: 'AVALIADA',
    notaPublicada: 880,
    publicadoEm: new Date(2026, 7, 5, 12).toISOString(),
  })

  assert.deepEqual(descricao, {
    faixa: 'sucesso',
    legenda: 'Publicada em 05/08',
    nota: {
      texto: 'Nota 880/1000',
      tom: 'sucesso',
    },
    acao: {
      rotulo: 'Ver feedback',
      destino: '/aluno/redacoes/r1/feedback',
      variante: 'suave',
    },
  })
})

test('descreve redações em correção e em rascunho', () => {
  const emCorrecao = descreverRedacao({
    id: 'r2',
    temaId: 't2',
    status: 'ENVIADA',
    enviadaEm: new Date(2026, 7, 4, 9).toISOString(),
    notaPublicada: null,
  })
  const rascunho = descreverRedacao({
    id: 'r3',
    temaId: 't3',
    status: 'RASCUNHO',
    notaPublicada: null,
  })

  assert.equal(emCorrecao.legenda, 'Em correção desde 04/08')
  assert.deepEqual(emCorrecao.nota, {
    texto: 'Sem nota',
    tom: 'atencao',
  })
  assert.equal(emCorrecao.acao.rotulo, 'Acompanhar')
  assert.equal(
    emCorrecao.acao.destino,
    '/aluno/temas/t2/redacao',
  )

  assert.equal(
    rascunho.legenda,
    'Rascunho salvo · não entregue',
  )
  assert.equal(rascunho.nota.tom, 'neutro')
  assert.equal(rascunho.acao.rotulo, 'Continuar')
})

test('formata indicadores sem inventar valores', () => {
  assert.equal(formatarIndicador(833.3), '833')
  assert.equal(formatarIndicador(null), null)
  assert.equal(calcularPercentual(150, 200), 75)
  assert.equal(calcularPercentual(250, 200), 100)
  assert.equal(calcularPercentual(null, 200), 0)
})
