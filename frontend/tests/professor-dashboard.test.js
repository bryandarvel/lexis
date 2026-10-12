import assert from 'node:assert/strict'
import test from 'node:test'
import { diasDesdeEnvio, obterIniciais, resumirPainelProfessor } from '../src/utils/professor-dashboard.js'

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
