import assert from 'node:assert/strict'
import test from 'node:test'

import { respostaDeveSerAplicada } from '../src/utils/resposta-notificacoes.js'
import {
  aplicarConsulta,
  geracaoDe,
  iniciarConsulta,
} from '../src/utils/notificacoes-sequencia.js'
import { marcarConta } from '../src/utils/identidade-sessao.js'

const aviso = (id, lida = false) => ({
  id,
  tipo: 'REDACAO_ENVIADA',
  titulo: 'Aviso ' + id,
  mensagem: 'Mensagem fictícia.',
  lidaEm: lida ? '2026-11-12T12:00:00Z' : null,
})

const INICIAL = {
  usuarioId: null,
  geracao: 0,
  status: 'carregando',
  notificacoes: [],
  totalNaoLidas: 0,
  processandoId: null,
  mensagem: '',
}

/*
 * Central do professor, com a ordem sob controle. Cada consulta é "segurada" e só entrega a
 * resposta quando o teste mandar, reproduzindo a chegada tardia. O sino é representado pelas
 * emissões do evento de contagem: uma resposta que não vale não pode emitir nada.
 */
function criarCentral() {
  let estado = INICIAL
  let contaAtual = null
  let montado = false
  const emissoes = []

  return {
    get estado() { return estado },
    get emissoes() { return emissoes },
    entrar(conta) {
      // Troca de conta: o efeito anterior é limpo e o novo marca montado outra vez.
      montado = true
      contaAtual = conta
      // A geração continua de onde estava: duas consultas seguidas nunca recebem o mesmo número.
      const consulta = iniciarConsulta({ ...marcarConta(INICIAL, conta), geracao: geracaoDe(estado) })
      estado = consulta.estado
      return {
        conta,
        geracao: consulta.geracao,
        // A resposta carrega a conta e a geração de quem a pediu, como a closure do efeito.
        entregar(resultado, { cancelada = false } = {}) {
          if (!respostaDeveSerAplicada({
            montado,
            cancelada,
            contaDaConsulta: conta,
            contaAtual,
            estadoAtual: estado,
            geracao: consulta.geracao,
          })) {
            return false
          }

          estado = marcarConta(aplicarConsulta(estado, resultado, consulta.geracao), conta)
          emissoes.push(estado.totalNaoLidas)
          return true
        },
      }
    },
  }
}

// Defeito relatado: a resposta de A chega depois de B entrar e escreve na tela de B, inclusive
// avisando o sino com a contagem de A.
test('a resposta atrasada de A não altera a lista nem o sino de B', () => {
  const central = criarCentral()

  const consultaDeA = central.entrar('prof-a')
  const consultaDeB = central.entrar('prof-b')

  // B carrega normalmente: 1 aviso.
  assert.equal(consultaDeB.entregar({ notificacoes: [aviso('b1')] }), true)
  assert.equal(central.estado.totalNaoLidas, 1)
  assert.deepEqual(central.emissoes, [1])

  // Só agora a resposta de A chega, com 3 avisos.
  const aplicou = consultaDeA.entregar({
    notificacoes: [aviso('a1'), aviso('a2'), aviso('a3')],
  })

  assert.equal(aplicou, false, 'a resposta de A não pode ser aplicada')
  assert.equal(central.estado.totalNaoLidas, 1, 'a contagem de B precisa ficar em 1')
  assert.equal(central.estado.notificacoes.length, 1)
  assert.equal(central.estado.notificacoes[0].id, 'b1')
  assert.equal(central.estado.usuarioId, 'prof-b')
  assert.deepEqual(central.emissoes, [1], 'o sino não pode receber a contagem de A')
})

test('a resposta de uma consulta cancelada não entra', () => {
  const central = criarCentral()
  const consulta = central.entrar('prof-a')

  assert.equal(consulta.entregar({ notificacoes: [aviso('a1')] }, { cancelada: true }), false)
  assert.equal(central.estado.notificacoes.length, 0)
  assert.deepEqual(central.emissoes, [])
})

test('a resposta de uma consulta substituída por outra mais nova não entra', () => {
  const central = criarCentral()
  const primeira = central.entrar('prof-a')
  const segunda = central.entrar('prof-a')

  assert.equal(segunda.entregar({ notificacoes: [aviso('novo')] }), true)
  assert.equal(primeira.entregar({ notificacoes: [aviso('velho'), aviso('velho2')] }), false)
  assert.equal(central.estado.notificacoes[0].id, 'novo')
  assert.deepEqual(central.emissoes, [1])
})

test('reautenticar na mesma conta preserva o que a consulta dela trouxer', () => {
  const central = criarCentral()
  const consulta = central.entrar('prof-a')

  assert.equal(consulta.entregar({ notificacoes: [aviso('a1'), aviso('a2')] }), true)
  assert.equal(central.estado.totalNaoLidas, 2)
  assert.equal(central.estado.usuarioId, 'prof-a')
  assert.deepEqual(central.emissoes, [2])
})

test('a decisão isolada cobre cada motivo de recusa', () => {
  const base = {
    montado: true,
    cancelada: false,
    contaDaConsulta: 'prof-a',
    contaAtual: 'prof-a',
    estadoAtual: { geracao: 2 },
    geracao: 2,
  }

  assert.equal(respostaDeveSerAplicada(base), true)
  assert.equal(respostaDeveSerAplicada({ ...base, montado: false }), false)
  assert.equal(respostaDeveSerAplicada({ ...base, cancelada: true }), false)
  assert.equal(respostaDeveSerAplicada({ ...base, contaAtual: 'prof-b' }), false)
  assert.equal(respostaDeveSerAplicada({ ...base, contaAtual: null }), false)
  assert.equal(respostaDeveSerAplicada({ ...base, estadoAtual: { geracao: 3 } }), false)
  assert.equal(respostaDeveSerAplicada(), false)
})
