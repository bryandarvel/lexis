import assert from 'node:assert/strict'
import test from 'node:test'

import { descreverEntregasProposta } from '../src/utils/professor-topic.js'

const resumo = (extra = {}) => ({
  totalAlunosAtivos: 5,
  alunosAtivosQueEntregaram: 3,
  alunosSemMatriculaAtivaQueEntregaram: 0,
  ...extra,
})

test('usa numerador e denominador do mesmo resumo', () => {
  const entregas = descreverEntregasProposta(resumo())

  assert.equal(entregas.disponivel, true)
  assert.equal(entregas.texto, '3 de 5 alunos entregaram')
  assert.equal(entregas.percentual, 60)
  assert.equal(entregas.textoHistorico, null)
})

// O defeito da #54: seis redações recebidas numa turma de cinco alunos ativos,
// porque ex-alunos entregaram. O resumo mantém a conta dentro de 100%.
test('seis entregas com cinco alunos ativos não passam de 100%', () => {
  const entregas = descreverEntregasProposta(
    resumo({ alunosAtivosQueEntregaram: 5, alunosSemMatriculaAtivaQueEntregaram: 1 }),
  )

  assert.equal(entregas.texto, '5 de 5 alunos entregaram')
  assert.equal(entregas.percentual, 100)
  assert.equal(entregas.textoHistorico, '1 entrega de aluno sem matrícula ativa')
})

test('numerador incoerente é limitado ao total, sem passar de 100%', () => {
  const entregas = descreverEntregasProposta(
    resumo({ totalAlunosAtivos: 5, alunosAtivosQueEntregaram: 6 }),
  )

  assert.equal(entregas.texto, '5 de 5 alunos entregaram')
  assert.equal(entregas.percentual, 100)
})

test('turma arquivada tem zero ativos e não divide por zero', () => {
  const entregas = descreverEntregasProposta(
    resumo({ totalAlunosAtivos: 0, alunosAtivosQueEntregaram: 0, alunosSemMatriculaAtivaQueEntregaram: 4 }),
  )

  assert.equal(entregas.disponivel, true)
  assert.equal(entregas.texto, 'Nenhum aluno ativo na turma')
  assert.equal(entregas.percentual, null)
  assert.equal(entregas.textoHistorico, '4 entregas de alunos sem matrícula ativa')
})

test('resumo ausente ou inválido informa indisponibilidade, sem inventar número', () => {
  for (const invalido of [undefined, null, {}, { totalAlunosAtivos: 5 }, { totalAlunosAtivos: -1, alunosAtivosQueEntregaram: 1 }]) {
    const entregas = descreverEntregasProposta(invalido)

    assert.equal(entregas.disponivel, false)
    assert.equal(entregas.texto, 'Contagem de entregas indisponível')
    assert.equal(entregas.percentual, null)
  }
})

test('singular quando a turma tem um aluno ativo', () => {
  const entregas = descreverEntregasProposta(
    resumo({ totalAlunosAtivos: 1, alunosAtivosQueEntregaram: 1 }),
  )

  assert.equal(entregas.texto, '1 de 1 aluno entregou')
})
