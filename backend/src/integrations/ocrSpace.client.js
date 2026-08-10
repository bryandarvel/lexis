import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

function criarErroConfiguracaoAusente() {
  return new AppError(
    'O serviço de transcrição não está configurado.',
    {
      statusCode: 503,
      code: 'OCR_NOT_CONFIGURED',
    },
  )
}

function criarErroTimeout() {
  return new AppError(
    'O serviço de transcrição demorou mais que o esperado.',
    {
      statusCode: 504,
      code: 'OCR_TIMEOUT',
    },
  )
}

function criarErroServicoIndisponivel(statusExterno) {
  return new AppError(
    'Não foi possível acessar o serviço de transcrição.',
    {
      statusCode: 502,
      code: 'OCR_SERVICE_UNAVAILABLE',
      details: {
        statusExterno,
      },
    },
  )
}

function criarErroLimiteExterno() {
  return new AppError(
    'O limite temporário do serviço de transcrição foi atingido.',
    {
      statusCode: 503,
      code: 'OCR_SERVICE_LIMIT_REACHED',
    },
  )
}

function criarErroProcessamento(codigoSaida) {
  return new AppError(
    'O serviço não conseguiu processar a imagem enviada.',
    {
      statusCode: 422,
      code: 'OCR_PROCESSING_FAILED',
      details: {
        codigoSaida,
      },
    },
  )
}

function criarErroTextoNaoEncontrado() {
  return new AppError(
    'Nenhum texto legível foi encontrado na imagem.',
    {
      statusCode: 422,
      code: 'OCR_TEXT_NOT_FOUND',
    },
  )
}

function foiTimeout(erro) {
  return (
    erro?.name === 'TimeoutError' ||
    erro?.name === 'AbortError'
  )
}

function extrairTextoDaResposta(resposta) {
  return (resposta.ParsedResults ?? [])
    .map((resultado) => resultado.ParsedText?.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function validarRespostaDoOcr(resposta) {
  if (
    resposta?.IsErroredOnProcessing ||
    !Array.isArray(resposta?.ParsedResults)
  ) {
    throw criarErroProcessamento(
      resposta?.OCRExitCode ?? null,
    )
  }

  const texto = extrairTextoDaResposta(resposta)

  if (!texto) {
    throw criarErroTextoNaoEncontrado()
  }

  return {
    texto,
    codigoSaida: resposta.OCRExitCode ?? null,
    tempoProcessamentoMs:
      resposta.ProcessingTimeInMilliseconds ?? null,
  }
}

export async function extrairTextoComOcrSpace(
  {
    buffer,
    mimetype,
    nomeArquivo,
  },
  {
    fetchImpl = fetch,
    apiKey = env.OCR_SPACE_API_KEY,
  } = {},
) {
  if (!apiKey) {
    throw criarErroConfiguracaoAusente()
  }

  const formulario = new FormData()

  formulario.append(
    'file',
    new Blob([buffer], {
      type: mimetype,
    }),
    nomeArquivo,
  )
  formulario.append(
    'language',
    env.OCR_SPACE_LANGUAGE,
  )
  formulario.append(
    'OCREngine',
    String(env.OCR_SPACE_ENGINE),
  )
  formulario.append('isOverlayRequired', 'false')
  formulario.append('detectOrientation', 'true')
  formulario.append('scale', 'true')

  let respostaHttp

  try {
    respostaHttp = await fetchImpl(
      env.OCR_SPACE_API_URL,
      {
        method: 'POST',
        headers: {
          apikey: apiKey,
        },
        body: formulario,
        signal: AbortSignal.timeout(
          env.OCR_TIMEOUT_MS,
        ),
      },
    )
  } catch (erro) {
    if (foiTimeout(erro)) {
      throw criarErroTimeout()
    }

    throw criarErroServicoIndisponivel(null)
  }

  if (respostaHttp.status === 429) {
    throw criarErroLimiteExterno()
  }

  if (!respostaHttp.ok) {
    throw criarErroServicoIndisponivel(
      respostaHttp.status,
    )
  }

  let respostaOcr

  try {
    respostaOcr = await respostaHttp.json()
  } catch {
    throw criarErroServicoIndisponivel(
      respostaHttp.status,
    )
  }

  return validarRespostaDoOcr(respostaOcr)
}