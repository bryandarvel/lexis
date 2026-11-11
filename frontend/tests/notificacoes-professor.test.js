import assert from 'node:assert/strict'
import test from 'node:test'

import {
  descreverAvisoProfessor,
  mensagemDeFalha,
} from '../src/utils/notificacoes-professor.js'
import {
  estadoDaContaAtual,
  marcarConta,
  mesmaConta,
} from '../src/utils/identidade-sessao.js'

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

// Revisão do PR #123, defeito A: a tela renderizava o objeto de
// interpretarErroApi ({ mensagem, campos }) e o React quebrava a página.
test('a falha na listagem vira texto renderizável, nunca um objeto', () => {
  const erro = {
    response: { data: { error: { message: 'O servidor falhou ao listar.' } } },
  }
  const texto = mensagemDeFalha(erro, 'Não foi possível carregar seus avisos.')

  assert.equal(typeof texto, 'string')
  assert.equal(texto, 'O servidor falhou ao listar.')
})

test('a falha ao marcar como lido também vira texto, com padrão quando o servidor não explica', () => {
  const padrao = 'Não foi possível marcar o aviso como lido. Tente novamente.'

  assert.equal(mensagemDeFalha(new Error('Network Error'), padrao), padrao)
  assert.equal(mensagemDeFalha({ response: { data: {} } }, padrao), padrao)
  assert.equal(mensagemDeFalha({ response: { data: { error: { message: '   ' } } } }, padrao), padrao)
  assert.equal(
    mensagemDeFalha({ response: { data: { error: { message: 'Aviso de outra pessoa.' } } } }, padrao),
    'Aviso de outra pessoa.',
  )
})

test('nenhuma mensagem de falha é objeto, em qualquer formato de erro', () => {
  const padrao = 'Falhou.'

  for (const erro of [undefined, null, {}, new Error('x'), { response: { data: { error: { message: 'ok', details: [{ field: 'a', message: 'b' }] } } } }]) {
    assert.equal(typeof mensagemDeFalha(erro, padrao), 'string')
  }
})

// Revisão do PR #123, defeito B: os avisos de A ficavam na tela de B.
const INICIAL_AVISOS = {
  usuarioId: null,
  status: 'carregando',
  notificacoes: [],
  totalNaoLidas: 0,
  processandoId: null,
  mensagem: '',
}

const avisosDe = (usuarioId, notificacoes, totalNaoLidas) =>
  marcarConta(
    { ...INICIAL_AVISOS, status: 'pronto', notificacoes, totalNaoLidas },
    usuarioId,
  )

test('ao trocar de professor, a lista e a contagem de A não aparecem para B', () => {
  const deA = avisosDe('prof-a', [redacaoEnviada()], 3)

  assert.equal(estadoDaContaAtual(deA, 'prof-a', INICIAL_AVISOS).totalNaoLidas, 3)
  const paraB = estadoDaContaAtual(deA, 'prof-b', INICIAL_AVISOS)
  assert.deepEqual(paraB, INICIAL_AVISOS)
  assert.deepEqual(paraB.notificacoes, [])
  assert.equal(paraB.totalNaoLidas, 0)
  assert.equal(paraB.status, 'carregando')
})

test('o aviso de erro de A não fica na tela de B', () => {
  const erroDeA = marcarConta(
    { ...INICIAL_AVISOS, status: 'erro', mensagem: 'Não foi possível carregar seus avisos.' },
    'prof-a',
  )

  assert.equal(estadoDaContaAtual(erroDeA, 'prof-b', INICIAL_AVISOS).mensagem, '')
  assert.equal(estadoDaContaAtual(erroDeA, 'prof-a', INICIAL_AVISOS).mensagem, 'Não foi possível carregar seus avisos.')
})

test('reautenticar no mesmo professor preserva a lista e a contagem', () => {
  const deA = avisosDe('prof-a', [redacaoEnviada()], 2)

  assert.deepEqual(estadoDaContaAtual(deA, 'prof-a', INICIAL_AVISOS), deA)
})

test('resposta atrasada pedida por A não marca aviso nem muda a contagem de B', () => {
  // mesmaConta é o que a página consulta ao receber a resposta da ação.
  assert.equal(mesmaConta('prof-a', 'prof-b'), false)
  assert.equal(mesmaConta('prof-a', 'prof-a'), true)

  const respostaDeA = avisosDe('prof-a', [redacaoEnviada({ lidaEm: '2026-11-10T12:00:00Z' })], 0)
  const deB = avisosDe('prof-b', [redacaoEnviada({ id: 'n-b' })], 1)

  assert.equal(estadoDaContaAtual(respostaDeA, 'prof-b', INICIAL_AVISOS).totalNaoLidas, 0)
  assert.equal(estadoDaContaAtual(deB, 'prof-b', INICIAL_AVISOS).notificacoes[0].id, 'n-b')
})

test('a contagem do sino também não herda a conta anterior', () => {
  const sinoDeA = marcarConta({ totalNaoLidas: 5 }, 'prof-a')
  const INICIAL_SINO = { totalNaoLidas: 0, usuarioId: null }

  assert.equal(estadoDaContaAtual(sinoDeA, 'prof-b', INICIAL_SINO).totalNaoLidas, 0)
  assert.equal(estadoDaContaAtual(sinoDeA, 'prof-a', INICIAL_SINO).totalNaoLidas, 5)
})
