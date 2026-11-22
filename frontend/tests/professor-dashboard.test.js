import assert from 'node:assert/strict'
import test from 'node:test'
import {
  descreverEspera,
  descreverIndicadoresDoPainel,
  descreverSituacaoDaTurma,
  diasDesdeEnvio,
  obterIniciais,
  resumirPainelProfessor,
  resumirTurma,
} from '../src/utils/professor-dashboard.js'

test('painel conta vínculos ativos e ordena somente redações pendentes pelo envio', () => {
  const turmas = [{ ativa: true, quantidadeAlunosAtivos: 3 }, { ativa: false, quantidadeAlunosAtivos: 20 }]
  const redacoes = [
    { id: 'nova', status: 'ENVIADA', enviadaEm: '2026-10-02T12:00:00Z' },
    { id: 'rascunho', status: 'RASCUNHO', enviadaEm: null },
    { id: 'corrigida', status: 'AVALIADA', enviadaEm: '2026-09-01T12:00:00Z' },
    { id: 'antiga', status: 'ENVIADA', enviadaEm: '2026-10-01T12:00:00Z' },
  ]
  const resumo = resumirPainelProfessor(turmas, redacoes, [])
  assert.equal(resumo.turmasAtivas, 1)
  assert.equal(resumo.alunosCadastrados, 3)
  assert.deepEqual(resumo.pendentes.map((r) => r.id), ['antiga', 'nova'])
  assert.equal(redacoes[0].id, 'nova')
})

test('painel conta cada redação publicada no mês apenas uma vez, incluindo republicações', () => {
  const agora = new Date(2026, 9, 10)
  const noMes = new Date(2026, 9, 2).toISOString()
  const anterior = new Date(2026, 8, 2).toISOString()
  const feedbacks = [
    { historico: [{ status: 'PUBLICADA', publicadoEm: noMes }, { status: 'SUBSTITUIDA', publicadoEm: noMes }] },
    { historico: [{ status: 'PUBLICADA', publicadoEm: anterior }, { status: 'RASCUNHO', publicadoEm: noMes }] },
    null,
  ]
  assert.equal(resumirPainelProfessor([], [], feedbacks, agora).publicadasNoMes, 1)
  assert.equal(resumirPainelProfessor([], [], null, agora).publicadasNoMes, null)
})

test('dias de espera respeitam dias de calendário e dados ausentes', () => {
  assert.equal(diasDesdeEnvio(new Date(2026, 9, 1, 23), new Date(2026, 9, 2, 1)), 1)
  assert.equal(diasDesdeEnvio(null), null)
  assert.equal(diasDesdeEnvio('invalida'), null)
  assert.equal(diasDesdeEnvio(new Date(2026, 9, 3), new Date(2026, 9, 2)), 0)
  assert.equal(obterIniciais(' Ana Lima '), 'AL')
})

/*
 * Situação por turma e indicadores do topo (Issue #178).
 */
const AGORA = new Date('2026-11-22T12:00:00Z')
const DIA = 86400000
const turmaDe = (id, nome, ativa = true, alunos = 8) =>
  ({ id, nome, ativa, quantidadeAlunosAtivos: alunos })
const redacaoDe = (turma, status, diasAtras = 0) => ({
  status,
  turma,
  enviadaEm: new Date(AGORA.getTime() - diasAtras * DIA).toISOString(),
})

test('a situação da turma conta o que espera, o que saiu e há quanto tempo', () => {
  const turma = turmaDe('t1', '3º A')
  const redacoes = [
    redacaoDe(turma, 'ENVIADA', 6),
    redacaoDe(turma, 'ENVIADA', 1),
    redacaoDe(turma, 'AVALIADA', 9),
    redacaoDe(turmaDe('t2', 'Outra'), 'ENVIADA', 30),
  ]

  const resumo = resumirTurma(turma, redacoes, { totalAlunosAtivos: 8, alunosAtivosQueEntregaram: 3 }, AGORA)

  assert.equal(resumo.aguardando, 2)
  assert.equal(resumo.corrigidas, 1)
  // A espera é a da pendente mais antiga, não a média.
  assert.equal(resumo.espera, 6)
  assert.equal(resumo.entregaram, 3)
  assert.equal(resumo.alunosAtivos, 8)
})

test('turma sem resumo de entregas não vira zero entregas', () => {
  const turma = turmaDe('t1', '3º A')
  const resumo = resumirTurma(turma, [], null, AGORA)

  assert.equal(resumo.entregaram, null)
  assert.equal(resumo.espera, null)
  assert.equal(resumo.aguardando, 0)
  // Sem resumo, o total de alunos cai para o que a turma já informava.
  assert.equal(resumo.alunosAtivos, 8)
})

test('o painel resume só as turmas ativas, com a mais represada na frente', () => {
  const calma = turmaDe('t1', 'Calma')
  const represada = turmaDe('t2', 'Represada')
  const arquivada = turmaDe('t3', 'Arquivada', false)
  const redacoes = [
    redacaoDe(calma, 'ENVIADA', 1),
    redacaoDe(represada, 'ENVIADA', 2),
    redacaoDe(represada, 'ENVIADA', 8),
    redacaoDe(arquivada, 'ENVIADA', 40),
  ]

  const { porTurma } = resumirPainelProfessor([calma, represada, arquivada], redacoes, [], AGORA)

  assert.deepEqual(porTurma.map((t) => t.nome), ['Represada', 'Calma'])
  assert.equal(porTurma.length, 2)
})

test('a espera vira texto legível, inclusive sem valor', () => {
  assert.equal(descreverEspera(null), '—')
  assert.equal(descreverEspera(undefined), '—')
  assert.equal(descreverEspera(0), 'hoje')
  assert.equal(descreverEspera(1), 'há 1 dia')
  assert.equal(descreverEspera(4), 'há 4 dias')
})

test('os quatro indicadores do topo saem do resumo do painel', () => {
  const painel = { pendentes: [1, 2, 3], publicadasNoMes: 5, turmasAtivas: 2, alunosCadastrados: 17 }

  assert.deepEqual(
    descreverIndicadoresDoPainel(painel).map((i) => [i.rotulo, i.valor]),
    [
      ['Aguardando correção', '3'],
      ['Correções no mês', '5'],
      ['Turmas ativas', '2'],
      ['Alunos ativos', '17'],
    ],
  )
})

test('histórico de publicações sem resposta vira travessão, nunca zero', () => {
  const indicadores = descreverIndicadoresDoPainel({ pendentes: [], publicadasNoMes: null, turmasAtivas: 0, alunosCadastrados: 0 })

  assert.equal(indicadores[1].valor, '—')
  // Zero de verdade continua sendo zero.
  assert.equal(descreverIndicadoresDoPainel({ publicadasNoMes: 0 })[1].valor, '0')
})

test('a situação da turma destaca o que está esperando e o que atrasou', () => {
  const comAtraso = descreverSituacaoDaTurma({ aguardando: 2, corrigidas: 1, espera: 7, entregaram: 3, alunosAtivos: 8 })

  assert.equal(comAtraso[0].tom, 'atencao')
  assert.equal(comAtraso[2].tom, 'atraso')
  assert.equal(comAtraso[2].valor, 'há 7 dias')
  assert.equal(comAtraso[3].valor, '3 de 8')

  const emDia = descreverSituacaoDaTurma({ aguardando: 0, corrigidas: 4, espera: null, entregaram: null })

  assert.equal(emDia[0].tom, 'neutro')
  assert.equal(emDia[2].valor, '—')
  assert.equal(emDia[3].valor, '—')
})
