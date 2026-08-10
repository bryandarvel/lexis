import { GoogleGenAI } from '@google/genai'

import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

function criarErroConfiguracaoAusente() {
  return new AppError(
    'O serviço de análise por inteligência artificial não está configurado.',
    {
      statusCode: 503,
      code: 'GEMINI_NOT_CONFIGURED',
    },
  )
}

function criarErroTimeout() {
  return new AppError(
    'O serviço de análise por inteligência artificial demorou mais que o esperado.',
    {
      statusCode: 504,
      code: 'GEMINI_TIMEOUT',
    },
  )
}

function criarErroLimiteExterno() {
  return new AppError(
    'O limite temporário do serviço de inteligência artificial foi atingido.',
    {
      statusCode: 503,
      code: 'GEMINI_SERVICE_LIMIT_REACHED',
    },
  )
}

function criarErroAutenticacaoExterna() {
  return new AppError(
    'Não foi possível autenticar no serviço de inteligência artificial.',
    {
      statusCode: 503,
      code: 'GEMINI_AUTHENTICATION_FAILED',
    },
  )
}

function criarErroServicoIndisponivel(statusExterno) {
  return new AppError(
    'Não foi possível acessar o serviço de inteligência artificial.',
    {
      statusCode: 502,
      code: 'GEMINI_SERVICE_UNAVAILABLE',
      details: {
        statusExterno,
      },
    },
  )
}

function criarErroRespostaInvalida() {
  return new AppError(
    'O serviço de inteligência artificial retornou uma resposta inválida.',
    {
      statusCode: 502,
      code: 'GEMINI_INVALID_RESPONSE',
    },
  )
}

function foiTimeout(erro) {
  return (
    erro?.name === 'TimeoutError' ||
    erro?.name === 'AbortError' ||
    erro?.code === 'ETIMEDOUT'
  )
}

function obterStatusExterno(erro) {
  const status = Number(
    erro?.status ??
      erro?.statusCode ??
      erro?.response?.status,
  )

  return Number.isInteger(status) ? status : null
}

function criarClienteGemini({ apiKey, timeoutMs }) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: timeoutMs,
    },
  })
}

export async function gerarConteudoComGemini(
  {
    input,
    systemInstruction,
    responseFormat,
    generationConfig,
  },
  {
    cliente,
    apiKey = env.GEMINI_API_KEY,
    model = env.GEMINI_MODEL,
    timeoutMs = env.GEMINI_TIMEOUT_MS,
  } = {},
) {
  if (!cliente && !apiKey) {
    throw criarErroConfiguracaoAusente()
  }

  const clienteEfetivo =
    cliente ?? criarClienteGemini({ apiKey, timeoutMs })

  const parametros = {
    model,
    input,
    store: false,
  }

  if (systemInstruction) {
    parametros.system_instruction = systemInstruction
  }

  if (responseFormat) {
    parametros.response_format = responseFormat
  }

  if (generationConfig) {
    parametros.generation_config = generationConfig
  }

  try {
    const interacao =
      await clienteEfetivo.interactions.create(
        parametros,
        {
          timeout_ms: timeoutMs,
        },
      )

    const texto = interacao?.output_text?.trim()

    if (!texto) {
      throw criarErroRespostaInvalida()
    }

    return {
      texto,
      interacaoId: interacao.id ?? null,
      status: interacao.status ?? null,
      uso: interacao.usage ?? null,
    }
  } catch (erro) {
    if (erro instanceof AppError) {
      throw erro
    }

    if (foiTimeout(erro)) {
      throw criarErroTimeout()
    }

    const statusExterno = obterStatusExterno(erro)

    if (statusExterno === 429) {
      throw criarErroLimiteExterno()
    }

    if (
      statusExterno === 401 ||
      statusExterno === 403
    ) {
      throw criarErroAutenticacaoExterna()
    }

    throw criarErroServicoIndisponivel(
      statusExterno,
    )
  }
}
