import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aplicarBlocosDaConta,
  descreverConta,
  descreverTurma,
  formatarMembroDesde,
  formatarNota,
  resolverBloco,
  resumirDesempenho,
  rotularPapel,
} from '../src/utils/aluno-perfil.js'
import {
  estadoDaContaAtual,
  marcarConta,
} from '../src/utils/identidade-sessao.js'

test('rotula o papel e não inventa um para valores desconhecidos', () => {
  assert.equal(rotularPapel('ALUNO'), 'Aluno')
  assert.equal(rotularPapel('PROFESSOR'), 'Professor')
  assert.equal(rotularPapel('ADMIN'), 'Não informado')
  assert.equal(rotularPapel(undefined), 'Não informado')
})

test('formata "membro desde" por extenso e devolve null sem data válida', () => {
  assert.match(
    formatarMembroDesde('2026-03-10T12:00:00.000Z'),
    /^10 de março de 2026$/,
  )
  assert.equal(formatarMembroDesde(null), null)
  assert.equal(formatarMembroDesde('não é data'), null)
})

test('descreve a conta com nome, e-mail, papel e data', () => {
  assert.deepEqual(
    descreverConta({
      nome: '  Aluno Fictício ',
      email: 'aluno@lexis.example.com',
      papel: 'ALUNO',
      criadoEm: '2026-03-10T12:00:00.000Z',
    }),
    {
      nome: 'Aluno Fictício',
      email: 'aluno@lexis.example.com',
      papel: 'Aluno',
      membroDesde: '10 de março de 2026',
    },
  )
  assert.equal(descreverConta(null), null)
  assert.equal(descreverConta({}).nome, 'Não informado')
  assert.equal(descreverConta({}).membroDesde, null)
})

test('descreve a turma e o professor da matrícula atual', () => {
  const turma = descreverTurma({
    iniciadaEm: '2026-03-10T12:00:00.000Z',
    turma: {
      id: 't1',
      nome: ' Turma A ',
      ativa: true,
      professor: { nome: 'Professora Fictícia' },
    },
  })

  assert.equal(turma.turma, 'Turma A')
  assert.equal(turma.professor, 'Professora Fictícia')
  assert.equal(turma.desde, '10/03/2026')
  assert.equal(descreverTurma(null), null)
})

test('formata a nota em pt-BR com até uma casa decimal', () => {
  assert.equal(formatarNota(690), '690')
  assert.equal(formatarNota(690.5), '690,5')
  assert.equal(formatarNota(0), '0')
  assert.equal(formatarNota(null), null)
  assert.equal(formatarNota(undefined), null)
})

test('resume o desempenho com rótulos que dizem o que é medido', () => {
  const resumo = resumirDesempenho({
    mediaGeral: 690,
    ultimaNota: 840,
    totalEnviadas: 5,
    totalCorrigidas: 4,
  })

  assert.equal(resumo.semCorrecao, false)
  assert.deepEqual(
    resumo.itens.map((item) => [item.rotulo, item.valor, item.unidade]),
    [
      ['Média das notas publicadas', '690', '/ 1000'],
      ['Última nota publicada', '840', '/ 1000'],
      ['Redações enviadas', '5', null],
      ['Redações corrigidas', '4', null],
    ],
  )
})

test('sem correção publicada, notas ficam sem valor e a contagem aparece', () => {
  const resumo = resumirDesempenho({
    mediaGeral: null,
    ultimaNota: null,
    totalEnviadas: 0,
    totalCorrigidas: 0,
  })

  assert.equal(resumo.semCorrecao, true)
  assert.equal(resumo.itens[0].valor, null)
  assert.equal(resumo.itens[0].unidade, null)
  assert.equal(resumo.itens[2].valor, '0')
  assert.equal(resumirDesempenho(undefined).semCorrecao, true)
})

test('resolverBloco transforma o resultado do allSettled em estado', () => {
  assert.deepEqual(
    resolverBloco({ status: 'fulfilled', value: { a: 1 } }),
    { status: 'pronto', dados: { a: 1 } },
  )
  assert.deepEqual(
    resolverBloco({ status: 'rejected', reason: new Error('x') }),
    { status: 'erro', dados: null },
  )
})

test('resolverBloco aceita uma rejeição tratada como estado próprio', () => {
  const semTurma = { status: 'sem-turma', dados: null }
  const aceitarRejeicao = (motivo) =>
    motivo?.codigo === 'SEM' ? semTurma : null

  assert.deepEqual(
    resolverBloco(
      { status: 'rejected', reason: { codigo: 'SEM' } },
      { aceitarRejeicao },
    ),
    semTurma,
  )
  assert.equal(
    resolverBloco(
      { status: 'rejected', reason: { codigo: 'OUTRO' } },
      { aceitarRejeicao },
    ).status,
    'erro',
  )
})

// Isolamento por conta no Perfil (revisão do PR #85). Cada bloco (conta, turma, desempenho) é
// carregado por conta, e a resposta pertence a quem a pediu.
const ESTADO_INICIAL = marcarConta({ blocos: { conta: 'carregando', turma: 'carregando' } }, null)

const prontoDe = (usuarioId, blocos) => marcarConta({ blocos }, usuarioId)

test('ao trocar de conta, os blocos de A não aparecem para B', () => {
  const deA = prontoDe('aluno-a', { conta: { nome: 'Aluno A' }, turma: { nome: 'Turma de A' } })

  assert.equal(estadoDaContaAtual(deA, 'aluno-a', ESTADO_INICIAL).blocos.conta.nome, 'Aluno A')

  const paraB = estadoDaContaAtual(deA, 'aluno-b', ESTADO_INICIAL)

  assert.deepEqual(paraB, ESTADO_INICIAL)
  assert.equal(paraB.blocos.conta, 'carregando')
  assert.equal(paraB.blocos.turma, 'carregando')
})

test('a resposta da consulta de A que chega depois da troca não preenche a tela de B', () => {
  const deB = prontoDe('aluno-b', { conta: { nome: 'Aluno B' }, turma: { nome: 'Turma de B' } })

  const depois = aplicarBlocosDaConta(deB, 'aluno-a', () => ({
    conta: { nome: 'Aluno A' },
    turma: { nome: 'Turma de A' },
  }))

  assert.equal(depois, deB, 'o estado de B precisa ficar intacto')
  assert.equal(estadoDaContaAtual(depois, 'aluno-b', ESTADO_INICIAL).blocos.conta.nome, 'Aluno B')
})

test('a falha de um bloco pedido por A não apaga a tela de B', () => {
  const deB = prontoDe('aluno-b', { conta: { nome: 'Aluno B' }, turma: { nome: 'Turma de B' } })

  const depois = aplicarBlocosDaConta(deB, 'aluno-a', (blocos) => ({ ...blocos, turma: 'erro' }))

  assert.equal(depois.blocos.turma.nome, 'Turma de B')
})

test('a resposta da própria conta é aplicada e preserva a identidade', () => {
  const deA = prontoDe('aluno-a', { conta: 'carregando', turma: 'carregando' })

  const depois = aplicarBlocosDaConta(deA, 'aluno-a', (blocos) => ({
    ...blocos,
    conta: { nome: 'Aluno A' },
  }))

  assert.equal(depois.usuarioId, 'aluno-a')
  assert.equal(depois.blocos.conta.nome, 'Aluno A')
  assert.equal(depois.blocos.turma, 'carregando')
})

test('reautenticar na mesma conta preserva os blocos já carregados', () => {
  const deA = prontoDe('aluno-a', { conta: { nome: 'Aluno A' }, turma: { nome: 'Turma de A' } })
  const visivel = estadoDaContaAtual(deA, 'aluno-a', ESTADO_INICIAL)

  assert.equal(visivel.blocos.conta.nome, 'Aluno A')
  assert.equal(visivel.blocos.turma.nome, 'Turma de A')
})

test('sem conta autenticada os blocos voltam ao carregando', () => {
  const deA = prontoDe('aluno-a', { conta: { nome: 'Aluno A' }, turma: { nome: 'Turma de A' } })

  assert.deepEqual(estadoDaContaAtual(deA, null, ESTADO_INICIAL), ESTADO_INICIAL)
  // E uma resposta tardia sem conta também não entra.
  assert.equal(aplicarBlocosDaConta(deA, null, () => ({ conta: 'erro' })), deA)
})
