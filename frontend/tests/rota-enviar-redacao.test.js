import assert from 'node:assert/strict'
import { test } from 'node:test'

import { obterRotaEnviarRedacao } from '../src/utils/aluno-feedback.js'
import { selecionarPropostaAberta } from '../src/utils/aluno-painel.js'
import { ehDaContaAtual, estadoDaContaAtual, marcarConta } from '../src/utils/identidade-sessao.js'

// Regressão do atalho "Enviar redação" da sidebar: ele precisa usar a mesma
// regra do Painel. A entrega com atraso é permitida pelo backend, então uma
// proposta ativa vencida e ainda pendente continua disponível.
const agora = new Date(2026, 7, 4, 10, 0)

const tema = (id, dia, extra = {}) => ({
  id,
  enunciado: `Proposta ${id}`,
  prazoEntrega: new Date(2026, 7, dia).toISOString(),
  ...extra,
})

const rota = (id) => `/aluno/temas/${id}/redacao`

test('só propostas vencidas e pendentes: o atalho continua levando ao editor', () => {
  const temas = [tema('vencida', 1)]

  assert.equal(obterRotaEnviarRedacao(temas, [], agora), rota('vencida'))
  assert.equal(
    obterRotaEnviarRedacao(temas, [{ temaId: 'vencida', status: 'RASCUNHO' }], agora),
    rota('vencida'),
  )
})

test('futuras têm prioridade sobre a vencida pendente', () => {
  const temas = [tema('vencida', 1), tema('futura', 9), tema('futura-distante', 20)]

  assert.equal(obterRotaEnviarRedacao(temas, [], agora), rota('futura'))
})

test('proposta já enviada não entra no atalho', () => {
  const temas = [tema('enviada', 9)]

  for (const status of ['ENVIADA', 'AVALIADA']) {
    assert.equal(
      obterRotaEnviarRedacao(temas, [{ temaId: 'enviada', status }], agora),
      null,
    )
  }
})

test('proposta arquivada não entra no atalho, nem vencida nem futura', () => {
  const arquivadas = [
    tema('arquivada-futura', 9, { ativo: false }),
    tema('arquivada-vencida', 1, { ativo: false }),
  ]

  assert.equal(obterRotaEnviarRedacao(arquivadas, [], agora), null)
  assert.equal(
    obterRotaEnviarRedacao([...arquivadas, tema('valida', 9)], [], agora),
    rota('valida'),
  )
})

// Contraste com a regra anterior do hook: selecionarPropostaAberta descarta
// tudo o que está vencido, e era isso que deixava o atalho indisponível
// enquanto o Painel oferecia a mesma proposta.
test('a regra antiga descartava a vencida pendente que o atalho deve oferecer', () => {
  const temas = [tema('vencida', 1)]

  assert.equal(selecionarPropostaAberta(temas, [], agora), null)
  assert.equal(obterRotaEnviarRedacao(temas, [], agora), rota('vencida'))
})

// Isolamento por conta (revisão do PR #82): depois de reautenticar como outra
// pessoa, o atalho não pode continuar apontando para a proposta da conta
// anterior. O hook guarda a rota junto do id de quem a carregou e confere esse
// id no render e ao receber a resposta.
const INICIAL_ROTA = { rota: null, usuarioId: null }

const rotaDaConta = (temas, redacoes, usuarioId) =>
  marcarConta({ rota: obterRotaEnviarRedacao(temas, redacoes, agora) }, usuarioId)

test('ao trocar de conta, o atalho deixa de apontar para a proposta da conta anterior', () => {
  const deA = rotaDaConta([tema('proposta-de-a', 9)], [], 'aluno-a')

  assert.equal(deA.rota, rota('proposta-de-a'))
  // Para B, o estado de A não vale: o atalho fica indisponível até a consulta de B.
  assert.equal(estadoDaContaAtual(deA, 'aluno-b', INICIAL_ROTA).rota, null)
  assert.deepEqual(estadoDaContaAtual(deA, 'aluno-b', INICIAL_ROTA), INICIAL_ROTA)
})

test('reautenticar na mesma conta preserva o atalho já carregado', () => {
  const deA = rotaDaConta([tema('proposta-de-a', 9)], [], 'aluno-a')

  assert.equal(estadoDaContaAtual(deA, 'aluno-a', INICIAL_ROTA).rota, rota('proposta-de-a'))
})

test('resposta atrasada pedida por A não preenche o atalho de B', () => {
  const respostaDeA = rotaDaConta([tema('proposta-de-a', 9)], [], 'aluno-a')
  const deB = rotaDaConta([tema('proposta-de-b', 9)], [], 'aluno-b')

  assert.equal(ehDaContaAtual(respostaDeA, 'aluno-b'), false)
  // Mesmo que a resposta de A grave o estado, o render de B não a aceita.
  assert.equal(estadoDaContaAtual(respostaDeA, 'aluno-b', INICIAL_ROTA).rota, null)
  assert.equal(estadoDaContaAtual(deB, 'aluno-b', INICIAL_ROTA).rota, rota('proposta-de-b'))
})

test('sem conta autenticada o atalho não herda a rota de ninguém', () => {
  const deA = rotaDaConta([tema('proposta-de-a', 9)], [], 'aluno-a')

  assert.equal(estadoDaContaAtual(deA, null, INICIAL_ROTA).rota, null)
  assert.equal(estadoDaContaAtual(deA, undefined, INICIAL_ROTA).rota, null)
})
