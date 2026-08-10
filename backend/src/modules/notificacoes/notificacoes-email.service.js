import { env } from '../../config/env.js'
import { enviarEmailComResend } from '../../integrations/resend.client.js'

import {
  registrarFalhaNotificacaoEmail,
  registrarNotificacaoEmailEnviada,
  reservarProximaNotificacaoEmail,
} from './notificacoes-email.repository.js'

function escaparHtml(valor) {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function criarLinkCorrecao(notificacao, frontendUrl) {
  const redacaoId =
    notificacao.feedbackVersao.feedback.redacaoId
  const destino = `/aluno/redacoes/${redacaoId}/feedback`

  return `${frontendUrl}/login?redirect=${encodeURIComponent(destino)}`
}

export function criarConteudoEmailNotificacao(
  notificacao,
  { frontendUrl = env.FRONTEND_URL } = {},
) {
  const link = criarLinkCorrecao(
    notificacao,
    frontendUrl,
  )
  const assunto = `LÉXIS — ${notificacao.titulo}`
  const texto = [
    notificacao.mensagem,
    '',
    `Acesse o LÉXIS para consultar a correção: ${link}`,
    '',
    'Por segurança, a redação, a nota e o feedback não são enviados por e-mail.',
  ].join('\n')
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#12324a">',
    `<h1 style="font-size:22px">${escaparHtml(notificacao.titulo)}</h1>`,
    `<p>${escaparHtml(notificacao.mensagem)}</p>`,
    `<p><a href="${escaparHtml(link)}">Acessar o LÉXIS</a></p>`,
    '<p style="font-size:13px;color:#5d7282">Por segurança, a redação, a nota e o feedback não são enviados por e-mail.</p>',
    '</div>',
  ].join('')

  return {
    assunto,
    texto,
    html,
    link,
  }
}

function obterMensagemSegura(erro) {
  const codigo =
    typeof erro?.code === 'string'
      ? erro.code
      : 'EMAIL_SEND_FAILED'
  const mensagem =
    typeof erro?.message === 'string'
      ? erro.message
      : 'Falha desconhecida no envio.'

  return `${codigo}: ${mensagem}`.slice(0, 1000)
}

function obterDestinatario(
  notificacao,
  { ambiente, destinatarioDemonstracao },
) {
  if (ambiente === 'production') {
    return notificacao.emailDestino
  }

  return destinatarioDemonstracao
}

export async function processarFilaEmailsNotificacao(
  {
    limite = env.EMAIL_BATCH_SIZE,
  } = {},
  {
    habilitado = env.EMAIL_ENABLED,
    ambiente = env.NODE_ENV,
    destinatarioDemonstracao =
      env.EMAIL_DEMO_RECIPIENT,
    maxTentativas = env.EMAIL_MAX_ATTEMPTS,
    atrasoTentativaMs = env.EMAIL_RETRY_DELAY_MS,
    agora = () => new Date(),
    reservar = reservarProximaNotificacaoEmail,
    enviar = enviarEmailComResend,
    registrarEnviada =
      registrarNotificacaoEmailEnviada,
    registrarFalha = registrarFalhaNotificacaoEmail,
  } = {},
) {
  const resumo = {
    habilitado,
    processados: 0,
    enviados: 0,
    erros: 0,
  }

  if (!habilitado) {
    return resumo
  }

  for (
    let indice = 0;
    indice < limite;
    indice += 1
  ) {
    const instante = agora()
    const notificacao = await reservar({
      agora: instante,
      maxTentativas,
    })

    if (!notificacao) {
      break
    }

    resumo.processados += 1

    try {
      const destinatario = obterDestinatario(
        notificacao,
        {
          ambiente,
          destinatarioDemonstracao,
        },
      )
      const conteudo = criarConteudoEmailNotificacao(
        notificacao,
      )

      await enviar({
        destinatario,
        assunto: conteudo.assunto,
        texto: conteudo.texto,
        html: conteudo.html,
        chaveIdempotencia: `lexis-notificacao/${notificacao.id}`,
      })
      await registrarEnviada({
        notificacaoId: notificacao.id,
        enviadaEm: agora(),
      })
      resumo.enviados += 1
    } catch (erro) {
      const possuiNovaTentativa =
        notificacao.tentativasEmail < maxTentativas
      const proximaTentativaEm = possuiNovaTentativa
        ? new Date(
            agora().getTime() + atrasoTentativaMs,
          )
        : null

      await registrarFalha({
        notificacaoId: notificacao.id,
        erro: obterMensagemSegura(erro),
        proximaTentativaEm,
      })
      resumo.erros += 1
    }
  }

  return resumo
}
