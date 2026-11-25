import { GoogleGenAI } from '@google/genai'

import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'
import { controleChamadasGemini } from './gemini-call-control.js'

function criarErroConfiguracaoAusente() {
  return new AppError(
    'O serviço de análise por inteligência artificial não está configurado.',
    {
      statusCode: 503,
      code: 'GEMINI_NOT_CONFIGURED',
    },
  )
}

function criarErroTimeout(retryAfterSeconds) {
  return new AppError(
    'O serviço de análise por inteligência artificial demorou mais que o esperado.',
    {
      statusCode: 504,
      code: 'GEMINI_TIMEOUT',
      details: { retryAfterSeconds },
    },
  )
}

function obterCorpoErro(erro) {
  // ApiError de generateContent guarda o JSON na mensagem, sem expô-lo à aplicação.
  if (erro?.name === 'ApiError' && typeof erro.message === 'string') {
    try { return JSON.parse(erro.message)?.error } catch { return null }
  }
  return erro?.error?.error ?? erro?.error ?? null
}

function validarEspera(segundos, agoraMs) {
  return Number.isSafeInteger(segundos) && segundos >= 0 &&
    Number.isSafeInteger(segundos * 1000 + agoraMs) ? segundos : 0
}

function obterEsperaDoProvedor(erro, corpo, agoraMs) {
  const headers = erro?.headers ?? erro?.response?.headers
  const valor = headers?.get?.('retry-after') ?? headers?.['retry-after']
  const esperaHeader = typeof valor === 'string' && valor.trim()
    ? validarEspera(/^\d+$/.test(valor.trim())
      ? Number(valor.trim()) : Math.ceil((Date.parse(valor) - agoraMs) / 1000), agoraMs)
    : 0
  // Este SDK não preserva os headers de ApiError; RetryInfo é o prazo estruturado.
  const detalhes = Array.isArray(corpo?.details) ? corpo.details : []
  const esperaCorpo = detalhes.reduce((maior, detalhe) => {
    if (detalhe?.['@type'] !== 'type.googleapis.com/google.rpc.RetryInfo' ||
      typeof detalhe.retryDelay !== 'string' || !/^\d+(?:\.\d{1,9})?s$/.test(detalhe.retryDelay)) return maior
    return Math.max(maior, validarEspera(Math.ceil(Number(detalhe.retryDelay.slice(0, -1))), agoraMs))
  }, 0)
  return Math.max(esperaHeader, esperaCorpo)
}

function criarErroLimiteExterno(erro, controle, agoraMs) {
  const corpo = obterCorpoErro(erro)
  const codigoRecebido = corpo?.code
  const codigoProvedor = ['rate_limit_exceeded', 'too_many_requests', 'quota_exceeded']
    .includes(codigoRecebido) ? codigoRecebido : 'unknown'
  // RESOURCE_EXHAUSTED não identifica, por si só, uma cota diária.
  const retryAfterSeconds = controle.registrarLimite(obterEsperaDoProvedor(erro, corpo, agoraMs))
  const diario = codigoProvedor === 'quota_exceeded'
  const temporario = ['rate_limit_exceeded', 'too_many_requests'].includes(codigoProvedor)
  const mensagem = diario
    ? 'O Google informou que a cota diária de IA do projeto foi atingida. Aguarde a renovação da cota ou confira os limites no Google AI Studio.'
    : temporario
      ? 'O Google limitou temporariamente as solicitações de IA do projeto.'
      : 'O Google recusou a análise por limite de uso, sem identificar qual cota foi atingida.'
  return new AppError(
    `${mensagem} A espera mínima informada não garante a liberação da cota.`,
    {
      statusCode: 503,
      code: diario ? 'GEMINI_DAILY_QUOTA_EXCEEDED' : temporario ? 'GEMINI_RATE_LIMITED' : 'GEMINI_SERVICE_LIMIT_REACHED',
      details: { statusExterno: 429, codigoProvedor, retryAfterSeconds },
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

function criarErroServicoIndisponivel(statusExterno, retryAfterSeconds) {
  return new AppError(
    retryAfterSeconds
      ? 'O serviço de inteligência artificial está temporariamente indisponível. Aguarde o intervalo indicado antes de tentar novamente.'
      : 'Não foi possível acessar o serviço de inteligência artificial.',
    {
      statusCode: 502,
      code: 'GEMINI_SERVICE_UNAVAILABLE',
      details: {
        statusExterno,
        ...(retryAfterSeconds && { retryAfterSeconds }),
      },
    },
  )
}

const codigosTransporte = new Set([
  'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET',
])

function obterCodigoTransporte(erro) {
  const codigo = erro?.cause?.code ?? erro?.code
  return codigosTransporte.has(codigo) ? codigo : null
}

function criarErroConexao(codigoTransporte, retryAfterSeconds) {
  return new AppError(
    'A conexão com o serviço de inteligência artificial falhou. Aguarde o intervalo indicado antes de tentar novamente.',
    { statusCode: 502, code: 'GEMINI_CONNECTION_FAILED', details: { statusExterno: null, codigoTransporte, retryAfterSeconds } },
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

  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : null
}

function criarClienteGemini({ apiKey, timeoutMs }) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: timeoutMs,
      retryOptions: { attempts: 1 },
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
    controle = controleChamadasGemini,
    agora = () => Date.now(),
  } = {},
) {
  if (!cliente && !apiKey) {
    throw criarErroConfiguracaoAusente()
  }

  const config = {
    ...generationConfig,
    httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
  }
  if (systemInstruction) {
    config.systemInstruction = systemInstruction
  }

  if (responseFormat) {
    config.responseMimeType = responseFormat.mime_type ?? 'application/json'
    config.responseJsonSchema = responseFormat.schema
  }
  // Omitir controles descontinuados em Gemini 3.6+ e 3.5 Flash-Lite.
  const versao = /^(?:models\/)?gemini-(\d+)(?:\.(\d+))?(?:-|$)/.exec(model)
  const flashLite35 = /^(?:models\/)?gemini-3\.5-flash-lite(?:-|$)/.test(model)
  if (flashLite35 || (versao && (Number(versao[1]) >= 4 || (Number(versao[1]) === 3 && Number(versao[2]) >= 6)))) {
    delete config.temperature
    delete config.topP
    delete config.topK
  }

  controle.iniciar()
  try {
    const clienteEfetivo =
      cliente ?? criarClienteGemini({ apiKey, timeoutMs })
    const resposta = await clienteEfetivo.models.generateContent({ model, contents: input, config })
    const texto = resposta?.text?.trim()
    const motivoFinal = resposta?.candidates?.[0]?.finishReason

    if (!texto || (motivoFinal && motivoFinal !== 'STOP')) {
      throw criarErroRespostaInvalida()
    }

    controle.registrarSucesso()

    return {
      texto,
      interacaoId: resposta.responseId ?? null,
      status: 'completed',
      uso: resposta.usageMetadata ?? null,
    }
  } catch (erro) {
    if (erro instanceof AppError) {
      throw erro
    }

    if (foiTimeout(erro)) {
      throw criarErroTimeout(controle.registrarIndisponibilidade())
    }

    const statusExterno = obterStatusExterno(erro)

    if (statusExterno === 429) {
      throw criarErroLimiteExterno(erro, controle, agora())
    }

    if (
      statusExterno === 401 ||
      statusExterno === 403
    ) {
      throw criarErroAutenticacaoExterna()
    }

    if (statusExterno !== null && statusExterno >= 400 && statusExterno < 500 && statusExterno !== 408) {
      throw new AppError(
        'O serviço de IA recusou a solicitação. É necessário verificar a configuração da integração antes de tentar novamente.',
        { statusCode: 502, code: 'GEMINI_REQUEST_REJECTED', details: { statusExterno } },
      )
    }

    const codigoTransporte = obterCodigoTransporte(erro)
    if (statusExterno === null && (codigoTransporte || (erro?.name === 'TypeError' && erro.message === 'fetch failed'))) {
      throw criarErroConexao(codigoTransporte ?? 'unknown', controle.registrarIndisponibilidade())
    }

    throw criarErroServicoIndisponivel(
      statusExterno,
      statusExterno >= 500 || statusExterno === 408
        ? controle.registrarIndisponibilidade(obterEsperaDoProvedor(erro, obterCorpoErro(erro), agora())) : undefined,
    )
  } finally {
    controle.concluir()
  }
}
