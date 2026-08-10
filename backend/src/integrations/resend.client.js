import { Resend } from 'resend'

import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

function criarErroConfiguracaoAusente() {
  return new AppError(
    'O serviço de e-mail não está configurado.',
    {
      statusCode: 503,
      code: 'EMAIL_NOT_CONFIGURED',
    },
  )
}

function criarErroEnvio(erroExterno) {
  const statusExterno = Number(
    erroExterno?.statusCode ?? erroExterno?.status,
  )

  if (statusExterno === 429) {
    return new AppError(
      'O limite temporário do serviço de e-mail foi atingido.',
      {
        statusCode: 503,
        code: 'EMAIL_SERVICE_LIMIT_REACHED',
      },
    )
  }

  if (statusExterno === 401) {
    return new AppError(
      'Não foi possível autenticar no serviço de e-mail.',
      {
        statusCode: 503,
        code: 'EMAIL_AUTHENTICATION_FAILED',
      },
    )
  }

  if (statusExterno === 403) {
    return new AppError(
      'O serviço de e-mail recusou o remetente ou o destinatário configurado.',
      {
        statusCode: 503,
        code: 'EMAIL_DELIVERY_FORBIDDEN',
      },
    )
  }

  return new AppError(
    'Não foi possível enviar o e-mail.',
    {
      statusCode: 502,
      code: 'EMAIL_SEND_FAILED',
      details: {
        statusExterno: Number.isInteger(statusExterno)
          ? statusExterno
          : null,
      },
    },
  )
}

export async function enviarEmailComResend(
  {
    destinatario,
    assunto,
    texto,
    html,
    chaveIdempotencia,
  },
  {
    cliente,
    apiKey = env.RESEND_API_KEY,
    remetente = env.RESEND_FROM,
  } = {},
) {
  if (!cliente && !apiKey) {
    throw criarErroConfiguracaoAusente()
  }

  const clienteEfetivo = cliente ?? new Resend(apiKey)
  let resposta

  try {
    resposta = await clienteEfetivo.emails.send(
      {
        from: remetente,
        to: [destinatario],
        subject: assunto,
        text: texto,
        html,
      },
      {
        idempotencyKey: chaveIdempotencia,
      },
    )
  } catch (erro) {
    throw criarErroEnvio(erro)
  }

  if (resposta?.error) {
    throw criarErroEnvio(resposta.error)
  }

  if (!resposta?.data?.id) {
    throw criarErroEnvio(null)
  }

  return {
    emailExternoId: resposta.data.id,
  }
}
