import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarTurmas, prepararNomeTurma, resumirRedacoesTurma } from '../src/utils/professor-classes.js'

test('busca turmas por nome ou código, sem acentos e respeitando a situação', () => {
  const turmas = [
    { id: 1, nome: 'Oficina de Redação', codigoAcesso: 'ABC23456', ativa: true },
    { id: 2, nome: 'Ensino Médio', codigoAcesso: 'DEF23456', ativa: false },
  ]
  assert.deepEqual(filtrarTurmas(turmas, 'redacao'), [turmas[0]])
  assert.deepEqual(filtrarTurmas(turmas, ' abc23 '), [turmas[0]])
  assert.deepEqual(filtrarTurmas(turmas, '', 'arquivadas'), [turmas[1]])
  assert.deepEqual(filtrarTurmas(turmas, 'medio', 'ativas'), [])
  assert.deepEqual(filtrarTurmas(turmas), turmas)
  assert.equal(turmas.length, 2)
})

test('progresso de correção considera só redações enviadas e avaliadas', () => {
  assert.deepEqual(resumirRedacoesTurma([
    { status: 'ENVIADA' }, { status: 'ENVIADA' }, { status: 'AVALIADA' }, { status: 'RASCUNHO' },
  ]), { pendentes: 2, avaliadas: 1, total: 3, progresso: 33 })
  assert.deepEqual(resumirRedacoesTurma([]), { pendentes: 0, avaliadas: 0, total: 0, progresso: 0 })
  assert.equal(resumirRedacoesTurma([{ status: 'AVALIADA' }]).progresso, 100)
})

test('nome de nova turma respeita limites e normalização do contrato', () => {
  assert.deepEqual(prepararNomeTurma('  3º A   — Ensino Médio  '), { nome: '3º A — Ensino Médio' })
  assert.ok(prepararNomeTurma(' ').erro)
  assert.ok(prepararNomeTurma('A').erro)
  assert.ok(prepararNomeTurma('A'.repeat(101)).erro)
  assert.equal(prepararNomeTurma('A'.repeat(100)).nome.length, 100)
})
