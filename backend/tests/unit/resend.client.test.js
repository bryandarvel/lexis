import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  enviarEmailComResend,
} from '../../src/integrations/resend.client.js'

function criarClienteSimulado(implementacao) {
  return {
    emails: {
      send: implementacao,
    },
  }
}

const email = {
  destinatario: 'demonstracao@exemplo.com',
  assunto: 'LÉXIS — Correção disponível',
  texto: 'A correção está disponível.',
  html: '<p>A correção está disponível.</p>',
  chaveIdempotencia: 'lexis-notificacao/notificacao-1',
}

describe('Cliente Resend', () => {
  it('deve enviar o e-mail com chave de idempotência', async () => {
    let chamadaRecebida
    const cliente = criarClienteSimulado(
      async (conteudo, opcoes) => {
        chamadaRecebida = { conteudo, opcoes }

        return {
          data: {
            id: 'email-externo-1',
          },
          error: null,
        }
      },
    )

    const resultado = await enviarEmailComResend(
      email,
      {
        cliente,
        remetente: 'LÉXIS <onboarding@resend.dev>',
      },
    )

    assert.deepEqual(chamadaRecebida, {
      conteudo: {
        from: 'LÉXIS <onboarding@resend.dev>',
        to: ['demonstracao@exemplo.com'],
        subject: email.assunto,
        text: email.texto,
        html: email.html,
      },
      opcoes: {
        idempotencyKey:
          'lexis-notificacao/notificacao-1',
      },
    })
    assert.deepEqual(resultado, {
      emailExternoId: 'email-externo-1',
    })
  })

  it('deve rejeitar quando a integração não estiver configurada', async () => {
    await assert.rejects(
      () =>
        enviarEmailComResend(email, {
          apiKey: '',
        }),
      (erro) => {
        assert.equal(erro.code, 'EMAIL_NOT_CONFIGURED')
        return true
      },
    )
  })

  it('deve transformar erro retornado pelo Resend', async () => {
    const cliente = criarClienteSimulado(
      async () => ({
        data: null,
        error: {
          statusCode: 429,
          message: 'Limite atingido',
        },
      }),
    )

    await assert.rejects(
      () => enviarEmailComResend(email, { cliente }),
      (erro) => {
        assert.equal(
          erro.code,
          'EMAIL_SERVICE_LIMIT_REACHED',
        )
        return true
      },
    )
  })

  it('deve transformar falha de autenticação', async () => {
    const cliente = criarClienteSimulado(async () => {
      const erro = new Error('Chave inválida')
      erro.statusCode = 401
      throw erro
    })

    await assert.rejects(
      () => enviarEmailComResend(email, { cliente }),
      (erro) => {
        assert.equal(
          erro.code,
          'EMAIL_AUTHENTICATION_FAILED',
        )
        return true
      },
    )
  })

  it('deve informar quando o remetente ou destinatário foi recusado', async () => {
    const cliente = criarClienteSimulado(
      async () => ({
        data: null,
        error: {
          statusCode: 403,
          message: 'Destinatário não autorizado',
        },
      }),
    )

    await assert.rejects(
      () => enviarEmailComResend(email, { cliente }),
      (erro) => {
        assert.equal(
          erro.code,
          'EMAIL_DELIVERY_FORBIDDEN',
        )
        return true
      },
    )
  })
})
