import assert from 'node:assert/strict'
import test from 'node:test'

import {
  descreverConta,
  descreverTurma,
  formatarMembroDesde,
  formatarNota,
  resolverBloco,
  resumirDesempenho,
  rotularPapel,
} from '../src/utils/aluno-perfil.js'

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
