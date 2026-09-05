import { env } from '../config/env.js'
import { AppError } from '../utils/app-error.js'

function criarErroTimeout() {
  return new AppError(
    'O LanguageTool excedeu o tempo limite.',
    {
      statusCode: 504,
      code: 'LANGUAGETOOL_TIMEOUT',
    },
  )
}

function criarErroIndisponivel() {
  return new AppError(
    'O LanguageTool está temporariamente indisponível.',
    {
      statusCode: 502,
      code: 'LANGUAGETOOL_UNAVAILABLE',
    },
  )
}

function criarErroLimite() {
  return new AppError(
    'O limite de uso do LanguageTool foi atingido.',
    {
      statusCode: 503,
      code: 'LANGUAGETOOL_LIMIT_REACHED',
    },
  )
}

function normalizarSugestao(match, texto, indice) {
  const inicio = Number.isInteger(match.offset)
    ? match.offset
    : 0
  const tamanho = Number.isInteger(match.length)
    ? match.length
    : 0
  const fim = Math.min(texto.length, inicio + tamanho)

  return {
    id: `${indice}-${inicio}-${fim}`,
    mensagem:
      typeof match.message === 'string'
        ? match.message
        : 'Sugestão linguística.',
    mensagemCurta:
      typeof match.shortMessage === 'string'
        ? match.shortMessage
        : '',
    inicio,
    fim,
    trecho: texto.slice(inicio, fim),
    substituicoes: Array.isArray(match.replacements)
      ? match.replacements
          .map((item) => item?.value)
          .filter((valor) => typeof valor === 'string')
          .slice(0, 5)
      : [],
    contexto:
      typeof match.context?.text === 'string'
        ? match.context.text
        : '',
    regra: {
      id:
        typeof match.rule?.id === 'string'
          ? match.rule.id
          : 'REGRA_DESCONHECIDA',
      categoria:
        typeof match.rule?.category?.name === 'string'
          ? match.rule.category.name
          : 'Revisão linguística',
    },
  }
}

export async function revisarTextoComLanguageTool(
  { texto },
  {
    fetchImpl = fetch,
    enabled = env.LANGUAGETOOL_ENABLED,
    apiUrl = env.LANGUAGETOOL_API_URL,
    language = env.LANGUAGETOOL_LANGUAGE,
    timeoutMs = env.LANGUAGETOOL_TIMEOUT_MS,
  } = {},
) {
  if (!enabled) {
    return {
      disponivel: false,
      status: 'DESATIVADO',
      sugestoes: [],
    }
  }

  const corpo = new URLSearchParams({
    text: texto,
    language,
  })

  try {
    const resposta = await fetchImpl(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body: corpo,
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (resposta.status === 429) {
      throw criarErroLimite()
    }

    if (!resposta.ok) {
      throw criarErroIndisponivel()
    }

    const dados = await resposta.json()
    const matches = Array.isArray(dados.matches)
      ? dados.matches
      : []

    return {
      disponivel: true,
      status: 'CONCLUIDO',
      idioma: dados.language?.code ?? language,
      versao: dados.software?.version ?? null,
      sugestoes: matches.map((match, indice) =>
        normalizarSugestao(match, texto, indice),
      ),
    }
  } catch (erro) {
    if (erro instanceof AppError) {
      throw erro
    }

    if (
      erro?.name === 'TimeoutError' ||
      erro?.name === 'AbortError'
    ) {
      throw criarErroTimeout()
    }

    throw criarErroIndisponivel()
  }
}
