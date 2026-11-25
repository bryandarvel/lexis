import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  descreverDialogoReabrirProposta,
  descreverDialogoReabrirTurma,
  descreverReabertura,
  mapearErroReabertura,
  MENSAGENS_SUCESSO_REABERTURA,
} from '../src/utils/reabertura.js'

function erroApi(status, code, message) {
  return { response: { status, data: { error: { code, message } } } }
}

test('turma arquivada oferece a reabertura e turma ativa não', () => {
  assert.deepEqual(descreverReabertura({ tipo: 'turma', arquivada: true }), { oferecer: true, bloqueada: false, motivo: '' })
  assert.equal(descreverReabertura({ tipo: 'turma', arquivada: false }).oferecer, false)
})

test('proposta arquivada com turma ativa oferece a reabertura', () => {
  const resultado = descreverReabertura({ tipo: 'proposta', arquivada: true, turmaAtiva: true })

  assert.equal(resultado.oferecer, true)
  assert.equal(resultado.bloqueada, false)
})

test('proposta arquivada com turma arquivada fica bloqueada e explica o motivo', () => {
  const resultado = descreverReabertura({ tipo: 'proposta', arquivada: true, turmaAtiva: false })

  assert.equal(resultado.oferecer, false)
  assert.equal(resultado.bloqueada, true)
  assert.match(resultado.motivo, /depois que a turma for reaberta/)
})

test('proposta ativa não oferece reabertura nem exibe bloqueio', () => {
  assert.deepEqual(
    descreverReabertura({ tipo: 'proposta', arquivada: false, turmaAtiva: false }),
    { oferecer: false, bloqueada: false, motivo: '' },
  )
})

test('turma já ativa e proposta já ativa pedem atualização e dizem que já estão ativas', () => {
  const turma = mapearErroReabertura(erroApi(409, 'CLASS_ALREADY_ACTIVE', 'x'), 'turma')
  const proposta = mapearErroReabertura(erroApi(409, 'ESSAY_TOPIC_ALREADY_ACTIVE', 'x'), 'proposta')

  assert.match(turma.mensagem, /turma já está ativa/)
  assert.equal(turma.recarregar, true)
  assert.match(proposta.mensagem, /proposta já está ativa/)
  assert.equal(proposta.recarregar, true)
})

test('proposta com turma arquivada orienta a reabrir a turma antes e indica o caminho da turma', () => {
  const resultado = mapearErroReabertura(erroApi(409, 'CLASS_ARCHIVED', 'Reabra a turma antes de reabrir a proposta.'), 'proposta')

  assert.equal(resultado.mensagem, 'Reabra a turma antes de reabrir a proposta.')
  assert.equal(resultado.caminhoTurma, true)
  assert.equal(resultado.recarregar, true)
})

test('404 diz que o item não foi encontrado, sem recarregar', () => {
  const turma = mapearErroReabertura(erroApi(404, 'CLASS_NOT_FOUND', 'x'), 'turma')
  const proposta = mapearErroReabertura(erroApi(404, 'ESSAY_TOPIC_NOT_FOUND', 'x'), 'proposta')

  assert.match(turma.mensagem, /turma não foi encontrada/)
  assert.match(proposta.mensagem, /proposta não foi encontrada/)
  assert.equal(turma.recarregar, false)
})

test('erro sem resposta é tratado como falha de rede', () => {
  const resultado = mapearErroReabertura(new Error('Network Error'), 'turma')

  assert.match(resultado.mensagem, /conexão/)
  assert.equal(resultado.recarregar, false)
})

test('401 pede nova entrada e erro desconhecido usa a mensagem do servidor ou um texto padrão', () => {
  assert.match(mapearErroReabertura(erroApi(401, 'UNAUTHORIZED', 'x'), 'turma').mensagem, /sessão expirou/)
  assert.equal(mapearErroReabertura(erroApi(500, 'INTERNAL', 'Falha interna.'), 'turma').mensagem, 'Falha interna.')
  assert.match(mapearErroReabertura({ response: { status: 500, data: {} } }, 'proposta').mensagem, /Tente novamente/)
})

test('o código de uma proposta não é confundido com o de uma turma', () => {
  const resultado = mapearErroReabertura(erroApi(409, 'CLASS_ALREADY_ACTIVE', 'Outra mensagem.'), 'proposta')

  assert.equal(resultado.recarregar, false)
  assert.equal(resultado.mensagem, 'Outra mensagem.')
})

test('o diálogo da turma informa código mantido, matrículas não restauradas e propostas arquivadas', () => {
  const { titulo, efeitos } = descreverDialogoReabrirTurma({ nome: '3ºA' })
  const texto = efeitos.join(' ')

  assert.match(titulo, /3ºA/)
  assert.match(texto, /mesmo código de acesso/)
  assert.match(texto, /matrículas encerradas.*não são restauradas/)
  assert.match(texto, /propostas arquivadas continuam arquivadas/)
})

test('o diálogo da proposta informa prazo original preservado e entrega atrasada', () => {
  const { titulo, efeitos } = descreverDialogoReabrirProposta({ enunciado: 'Tema X' })
  const texto = efeitos.join(' ')

  assert.match(titulo, /Tema X/)
  assert.match(texto, /prazo original/)
  assert.match(texto, /ainda podem enviar.*atrasada/)
})

test('as mensagens de sucesso não prometem restaurar matrículas', () => {
  assert.match(MENSAGENS_SUCESSO_REABERTURA.turma, /código de acesso/)
  assert.doesNotMatch(MENSAGENS_SUCESSO_REABERTURA.turma, /restaur/)
})
