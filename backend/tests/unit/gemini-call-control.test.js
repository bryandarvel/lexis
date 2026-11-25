import assert from 'node:assert/strict'
import { test } from 'node:test'
import { criarControleChamadasGemini } from '../../src/integrations/gemini-call-control.js'

test('espaça inícios de chamadas em 20 segundos, sem renovar a espera por pedido recusado', () => {
  let instante = 0
  const controle = criarControleChamadasGemini({ agora: () => instante })
  controle.iniciar()
  controle.concluir()
  instante = 10000
  assert.throws(() => controle.iniciar(), (erro) => erro.code === 'GEMINI_COOLDOWN' && erro.details.retryAfterSeconds === 10)
  instante = 20000
  assert.doesNotThrow(() => controle.iniciar())
  controle.concluir()
})

test('mesmo depois do intervalo, uma chamada em andamento impede nova chamada', () => {
  let instante = 0
  const controle = criarControleChamadasGemini({ agora: () => instante })
  controle.iniciar()
  instante = 60000
  assert.throws(() => controle.iniciar(), { code: 'GEMINI_REQUEST_IN_PROGRESS' })
  controle.concluir()
  assert.doesNotThrow(() => controle.iniciar())
  controle.concluir()
})

test('mantém o maior período de espera depois de bloqueio do provedor', () => {
  let instante = 0
  const controle = criarControleChamadasGemini({ agora: () => instante })
  controle.iniciar()
  assert.equal(controle.registrarLimite(180), 180)
  controle.concluir()
  instante = 10000
  assert.equal(controle.registrarLimite(1), 170)
  assert.throws(() => controle.iniciar(), (erro) => erro.details.retryAfterSeconds === 170)
})

test('falhas temporárias espaçam tentativas manuais progressivamente, com teto e recuperação', () => {
  let instante = 0
  const controle = criarControleChamadasGemini({ agora: () => instante })
  for (const segundos of [30, 60, 120, 240, 480, 480]) {
    controle.iniciar()
    assert.equal(controle.registrarIndisponibilidade(), segundos)
    controle.concluir()
    assert.throws(() => controle.iniciar(), { code: 'GEMINI_COOLDOWN' })
    instante += segundos * 1000
  }
  controle.iniciar()
  controle.registrarSucesso()
  controle.concluir()
  instante += 20000
  controle.iniciar()
  assert.equal(controle.registrarIndisponibilidade(), 30)
  controle.concluir()
})
