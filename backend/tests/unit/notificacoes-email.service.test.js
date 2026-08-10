import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  criarConteudoEmailNotificacao,
  processarFilaEmailsNotificacao,
} from '../../src/modules/notificacoes/notificacoes-email.service.js'

function criarNotificacao(
  sobrescritas = {},
) {
  return {
    id: 'notificacao-1',
    emailDestino: 'aluno@exemplo.com',
    titulo: 'Correção disponível',
    mensagem: 'Sua redação foi corrigida.',
    tentativasEmail: 1,
    feedbackVersao: {
      feedback: {
        redacaoId: 'redacao-1',
      },
    },
    ...sobrescritas,
  }
}

describe('Processador de e-mails das notificações', () => {
  it('deve permanecer inerte quando o envio está desativado', async () => {
    const resultado = await processarFilaEmailsNotificacao(
      {},
      {
        habilitado: false,
        reservar: async () => {
          throw new Error('Não deveria consultar a fila.')
        },
      },
    )

    assert.deepEqual(resultado, {
      habilitado: false,
      processados: 0,
      enviados: 0,
      erros: 0,
    })
  })

  it('deve redirecionar o envio local ao destinatário de demonstração', async () => {
    const notificacao = criarNotificacao()
    const chamadas = []
    let consultas = 0

    const resultado = await processarFilaEmailsNotificacao(
      { limite: 2 },
      {
        habilitado: true,
        ambiente: 'development',
        destinatarioDemonstracao:
          'demonstracao@exemplo.com',
        agora: () =>
          new Date('2026-08-07T18:00:00.000Z'),
        reservar: async () => {
          consultas += 1
          return consultas === 1 ? notificacao : null
        },
        enviar: async (dados) => {
          chamadas.push({ tipo: 'enviar', dados })
        },
        registrarEnviada: async (dados) => {
          chamadas.push({ tipo: 'registrar', dados })
        },
      },
    )

    assert.equal(
      chamadas[0].dados.destinatario,
      'demonstracao@exemplo.com',
    )
    assert.equal(
      chamadas[0].dados.chaveIdempotencia,
      'lexis-notificacao/notificacao-1',
    )
    assert.deepEqual(chamadas[1], {
      tipo: 'registrar',
      dados: {
        notificacaoId: 'notificacao-1',
        enviadaEm: new Date(
          '2026-08-07T18:00:00.000Z',
        ),
      },
    })
    assert.deepEqual(resultado, {
      habilitado: true,
      processados: 1,
      enviados: 1,
      erros: 0,
    })
  })

  it('deve registrar falha e agendar nova tentativa', async () => {
    const notificacao = criarNotificacao({
      tentativasEmail: 1,
    })
    let falhaRecebida
    let consultas = 0

    const resultado = await processarFilaEmailsNotificacao(
      { limite: 2 },
      {
        habilitado: true,
        ambiente: 'development',
        destinatarioDemonstracao:
          'demonstracao@exemplo.com',
        maxTentativas: 3,
        atrasoTentativaMs: 60000,
        agora: () =>
          new Date('2026-08-07T18:00:00.000Z'),
        reservar: async () => {
          consultas += 1
          return consultas === 1 ? notificacao : null
        },
        enviar: async () => {
          const erro = new Error('Falha simulada')
          erro.code = 'EMAIL_SEND_FAILED'
          throw erro
        },
        registrarFalha: async (dados) => {
          falhaRecebida = dados
        },
      },
    )

    assert.deepEqual(falhaRecebida, {
      notificacaoId: 'notificacao-1',
      erro: 'EMAIL_SEND_FAILED: Falha simulada',
      proximaTentativaEm: new Date(
        '2026-08-07T18:01:00.000Z',
      ),
    })
    assert.equal(resultado.erros, 1)
  })

  it('não deve agendar nova tentativa após atingir o limite', async () => {
    const notificacao = criarNotificacao({
      tentativasEmail: 3,
    })
    let falhaRecebida
    let consultas = 0

    await processarFilaEmailsNotificacao(
      { limite: 2 },
      {
        habilitado: true,
        ambiente: 'development',
        destinatarioDemonstracao:
          'demonstracao@exemplo.com',
        maxTentativas: 3,
        reservar: async () => {
          consultas += 1
          return consultas === 1 ? notificacao : null
        },
        enviar: async () => {
          throw new Error('Falha definitiva')
        },
        registrarFalha: async (dados) => {
          falhaRecebida = dados
        },
      },
    )

    assert.equal(
      falhaRecebida.proximaTentativaEm,
      null,
    )
  })

  it('deve omitir redação, nota e feedback do conteúdo', () => {
    const conteudo = criarConteudoEmailNotificacao(
      criarNotificacao(),
      {
        frontendUrl: 'http://localhost:5173',
      },
    )

    assert.match(conteudo.texto, /consultar a correção/)
    assert.match(conteudo.texto, /não são enviados/)
    assert.doesNotMatch(conteudo.texto, /850/)
    assert.doesNotMatch(
      conteudo.texto,
      /texto da redação/i,
    )
    assert.match(
      conteudo.link,
      /redacao-1%2Ffeedback/,
    )
  })
})
