import test from 'node:test'
import assert from 'node:assert/strict'
import {
  descreverSituacaoAluno,
  descreverSituacaoTurma,
  formatarDataEntrada,
  ordenarAlunosDaTurma,
  resumirAlunosDaTurma,
} from '../src/utils/professor-turma.js'
import { prepararNomeTurma } from '../src/utils/professor-classes.js'

test('situação da turma libera a gestão apenas com turma ativa', () => {
  assert.deepEqual(descreverSituacaoTurma({ ativa: true }), {
    ativa: true, rotulo: 'Ativa', podeGerenciar: true,
  })
  assert.deepEqual(descreverSituacaoTurma({ ativa: false }), {
    ativa: false, rotulo: 'Arquivada', podeGerenciar: false,
  })
  // Sem o campo, trata como ativa para não bloquear a tela por dado ausente.
  assert.equal(descreverSituacaoTurma({}).ativa, true)
  assert.equal(descreverSituacaoTurma(null).ativa, true)
})

test('situação do aluno distingue conta desativada de matrícula encerrada', () => {
  assert.deepEqual(descreverSituacaoAluno({ status: 'ATIVA', aluno: { ativo: true } }), {
    rotulo: 'Matrícula ativa', atencao: false,
  })
  assert.deepEqual(descreverSituacaoAluno({ status: 'ENCERRADA', aluno: { ativo: true } }), {
    rotulo: 'Matrícula encerrada', atencao: true,
  })
  // A conta desativada tem precedência: explica melhor por que o aluno sumiu.
  assert.deepEqual(descreverSituacaoAluno({ status: 'ATIVA', aluno: { ativo: false } }), {
    rotulo: 'Conta desativada', atencao: true,
  })
  assert.equal(descreverSituacaoAluno(undefined).rotulo, 'Matrícula ativa')
})

test('ordena alunos por nome em pt-BR, sem alterar a lista recebida', () => {
  const matriculas = [
    { id: '3', aluno: { nome: 'Édson Alves', email: 'c@x.test' } },
    { id: '1', aluno: { nome: 'ana lima', email: 'a@x.test' } },
    { id: '2', aluno: { nome: 'Ana Lima', email: 'b@x.test' } },
  ]
  const ordenadas = ordenarAlunosDaTurma(matriculas)

  assert.deepEqual(ordenadas.map((item) => item.id), ['1', '2', '3'])
  assert.deepEqual(matriculas.map((item) => item.id), ['3', '1', '2'])
  assert.deepEqual(ordenarAlunosDaTurma(null), [])
  assert.deepEqual(ordenarAlunosDaTurma([{ id: 'x' }]).map((i) => i.id), ['x'])
})

test('resumo da lista conta alunos e contas desativadas', () => {
  assert.deepEqual(resumirAlunosDaTurma([
    { aluno: { ativo: true } }, { aluno: { ativo: false } },
  ]), { total: 2, desativados: 1, rotulo: '2 alunos ativos' })
  assert.deepEqual(resumirAlunosDaTurma([{ aluno: { ativo: true } }]), {
    total: 1, desativados: 0, rotulo: '1 aluno ativo',
  })
  assert.deepEqual(resumirAlunosDaTurma([]), {
    total: 0, desativados: 0, rotulo: '0 alunos ativos',
  })
  assert.equal(resumirAlunosDaTurma(undefined).total, 0)
})

test('data de entrada é formatada e tolera valor ausente ou inválido', () => {
  assert.equal(formatarDataEntrada('2026-03-09T12:00:00.000Z'), '09/03/2026')
  assert.equal(formatarDataEntrada(null), 'Data indisponível')
  assert.equal(formatarDataEntrada('não é data'), 'Data indisponível')
})

test('renomear usa a mesma validação de nome da criação', () => {
  assert.deepEqual(prepararNomeTurma('  3º B   — Manhã  '), { nome: '3º B — Manhã' })
  assert.ok(prepararNomeTurma('A').erro)
  assert.ok(prepararNomeTurma('A'.repeat(101)).erro)
})
