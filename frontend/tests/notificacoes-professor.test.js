import assert from 'node:assert/strict'
import test from 'node:test'

import {
  descreverAvisoProfessor,
} from '../src/utils/notificacoes-professor.js'

const redacaoEnviada = (extra = {}) => ({
  id: 'n1',
  tipo: 'REDACAO_ENVIADA',
  titulo: 'Nova redação recebida',
  mensagem: 'Uma redação foi enviada.',
  lidaEm: null,
  feedbackVersao: null,
  redacaoId: 'red-1',
  redacao: {
    id: 'red-1',
    tema: {
      id: 'tema-1',
      enunciado: 'Proposta fictícia',
      turma: { id: 'turma-1', nome: 'Turma Fictícia' },
    },
  },
  ...extra,
})

test('redação enviada leva à correção da redação', () => {
  const aviso = descreverAvisoProfessor(redacaoEnviada())

  assert.equal(aviso.destino, '/professor/redacoes/red-1')
  assert.equal(aviso.rotulo, 'Ver redação →')
  assert.equal(aviso.acionavel, true)
})

test('aluno que saiu leva à turma', () => {
  const aviso = descreverAvisoProfessor({
    id: 'n2',
    tipo: 'ALUNO_SAIU_TURMA',
    lidaEm: null,
    turma: { id: 'turma-9', nome: 'Turma Fictícia' },
  })

  assert.equal(aviso.destino, '/professor/turmas/turma-9')
  assert.equal(aviso.rotulo, 'Ver turma →')
})

// O backend manda a turma dentro da redação nos eventos de envio; se um aviso
// de saída vier nesse formato, o destino continua sendo a turma.
test('a turma pode vir aninhada na redação', () => {
  const aviso = descreverAvisoProfessor({
    tipo: 'ALUNO_SAIU_TURMA',
    redacao: { tema: { turma: { id: 'turma-5' } } },
  })

  assert.equal(aviso.destino, '/professor/turmas/turma-5')
})

test('sem o id necessário o aviso só é marcado como lido', () => {
  const semRedacao = descreverAvisoProfessor({
    tipo: 'REDACAO_ENVIADA',
    redacaoId: null,
    redacao: null,
    lidaEm: null,
  })

  assert.equal(semRedacao.destino, null)
  assert.equal(semRedacao.rotulo, 'Marcar como lido')
  assert.equal(semRedacao.acionavel, true)

  const semTurma = descreverAvisoProfessor({
    tipo: 'ALUNO_SAIU_TURMA',
    lidaEm: null,
  })

  assert.equal(semTurma.destino, null)
})

test('tipo desconhecido não quebra nem promete destino', () => {
  for (const notificacao of [
    { tipo: 'TIPO_NOVO_DO_BACKEND' },
    { tipo: 'FEEDBACK_PUBLICADO' },
    {},
    null,
    undefined,
  ]) {
    const aviso = descreverAvisoProfessor(notificacao)

    assert.equal(aviso.destino, null)
    assert.equal(typeof aviso.rotulo, 'string')
  }
})

// Esses eventos chegam com feedbackVersao nulo; nunca derivar destino dele.
test('feedbackVersao não é usado nos eventos do professor', () => {
  const aviso = descreverAvisoProfessor({
    tipo: 'REDACAO_ENVIADA',
    redacaoId: null,
    feedbackVersao: { feedback: { redacaoId: 'red-de-outro-fluxo' } },
  })

  assert.equal(aviso.destino, null)
})

test('aviso já lido e sem destino não vira ação sem efeito', () => {
  const aviso = descreverAvisoProfessor({
    tipo: 'TIPO_NOVO_DO_BACKEND',
    lidaEm: '2026-11-06T10:00:00.000Z',
  })

  assert.equal(aviso.acionavel, false)
  assert.equal(aviso.rotulo, 'Lido')
})

test('ids são codificados na URL', () => {
  assert.equal(
    descreverAvisoProfessor(redacaoEnviada({ redacaoId: 'red/1', redacao: null })).destino,
    '/professor/redacoes/red%2F1',
  )
  assert.equal(
    descreverAvisoProfessor({ tipo: 'ALUNO_SAIU_TURMA', turma: { id: 't/9' } }).destino,
    '/professor/turmas/t%2F9',
  )
})

test('descreve a origem do aviso a partir do que a API fornece', () => {
  const aviso = descreverAvisoProfessor(redacaoEnviada())

  assert.equal(aviso.proposta, 'Proposta fictícia')
  assert.equal(aviso.turma, 'Turma Fictícia')

  // Sem os dados, não inventamos texto nenhum.
  const semContexto = descreverAvisoProfessor({ tipo: 'REDACAO_ENVIADA' })

  assert.equal(semContexto.proposta, null)
  assert.equal(semContexto.turma, null)
})
