export const LIMITE_CARACTERES_REDACAO = 20_000

export function mensagemRevisaoLinguistica(revisao) {
  if (revisao.status === 'DESATIVADO') return 'A revisão linguística está desativada neste ambiente. Seu texto pode ser salvo e enviado normalmente.'
  if (!revisao.disponivel) return revisao.mensagem ?? 'A revisão linguística está indisponível. Seu texto foi preservado e pode ser salvo ou enviado.'
  return revisao.sugestoes?.length > 0
    ? `${revisao.sugestoes.length} sugestão(ões) encontrada(s).`
    : 'Nenhuma sugestão foi encontrada.'
}
export const LIMITE_IMAGEM_REDACAO_BYTES = 1_048_576

const TIPOS_IMAGEM_ACEITOS = new Set([
  'image/jpeg',
  'image/png',
])

export function encontrarRedacaoPorTema(
  redacoes,
  temaId,
) {
  if (!Array.isArray(redacoes)) {
    return null
  }

  return (
    redacoes.find(
      (redacao) => redacao.temaId === temaId,
    ) ?? null
  )
}

export function validarImagemRedacao(imagem) {
  if (!imagem) {
    return 'Selecione uma imagem JPEG ou PNG.'
  }

  if (!TIPOS_IMAGEM_ACEITOS.has(imagem.type)) {
    return 'Utilize uma imagem JPEG ou PNG.'
  }

  if (imagem.size > LIMITE_IMAGEM_REDACAO_BYTES) {
    return 'A imagem deve possuir no máximo 1 MB.'
  }

  return null
}

export function calcularProgressoUpload(
  carregado,
  total,
) {
  if (!Number.isFinite(total) || total <= 0) {
    return null
  }

  const percentual = Math.round(
    (Math.max(0, carregado) / total) * 100,
  )

  return Math.min(100, percentual)
}

export function precisaConfirmarSubstituicaoOcr(
  texto,
) {
  return Boolean(texto?.trim())
}

export function aplicarSugestaoLinguistica(
  texto,
  sugestao,
  substituicao,
) {
  if (
    typeof substituicao !== 'string' ||
    !Number.isInteger(sugestao?.inicio) ||
    !Number.isInteger(sugestao?.fim) ||
    sugestao.inicio < 0 ||
    sugestao.fim <= sugestao.inicio ||
    sugestao.fim > texto.length ||
    texto.slice(sugestao.inicio, sugestao.fim) !==
      sugestao.trecho
  ) {
    return null
  }

  return [
    texto.slice(0, sugestao.inicio),
    substituicao,
    texto.slice(sugestao.fim),
  ].join('')
}

// Conferência pessoal do aluno: não é validada pela API e não bloqueia o envio.
// O tema não possui limite de linhas, então nenhum mínimo é exibido.
export const ITENS_CONFERENCIA_ENVIO = [
  {
    id: 'genero',
    rotulo: 'Texto dissertativo-argumentativo',
  },
  {
    id: 'repertorio',
    rotulo: 'Repertório com fonte identificada',
  },
  {
    id: 'extensao',
    rotulo: 'Extensão adequada à proposta',
  },
  {
    id: 'intervencao',
    rotulo: 'Proposta de intervenção redigida',
  },
]

const PADRAO_ORTOGRAFIA =
  /ortogr|digita|escrita|typo|spell|morfologik|hunspell/i

function converterData(valor) {
  if (!valor) {
    return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime())
    ? null
    : data
}

function obterPartesData(data, opcoes) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', opcoes)
      .formatToParts(data)
      .map(({ type, value }) => [type, value]),
  )
}

export function contarPalavras(texto) {
  return String(texto ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

// Linhas não vazias separadas por quebra de linha; não equivalem às linhas
// da folha oficial, que dependem da caligrafia.
export function contarLinhas(texto) {
  return String(texto ?? '')
    .split(/\r?\n/)
    .filter((linha) => linha.trim()).length
}

export function descreverExtensao(texto) {
  const palavras = contarPalavras(texto)
  const linhas = contarLinhas(texto)

  return [
    `${palavras.toLocaleString('pt-BR')} ${palavras === 1 ? 'palavra' : 'palavras'}`,
    `${linhas.toLocaleString('pt-BR')} ${linhas === 1 ? 'linha' : 'linhas'}`,
  ].join(' · ')
}

export function formatarHorario(valor) {
  const data = converterData(valor)

  if (!data) {
    return null
  }

  const partes = obterPartesData(data, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  return `${partes.hour}:${partes.minute}`
}

export function formatarPrazoCurto(valor) {
  const data = converterData(valor)

  if (!data) {
    return 'Prazo indisponível'
  }

  const partes = obterPartesData(data, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  return `${partes.day}/${partes.month}, ${partes.hour}h${partes.minute}`
}

export function descreverSugestao(sugestao) {
  const substituicao = sugestao?.substituicoes?.[0]
  const categoria =
    sugestao?.regra?.categoria || 'Revisão linguística'
  const ortografia = PADRAO_ORTOGRAFIA.test(
    `${sugestao?.regra?.id ?? ''} ${categoria}`,
  )

  return {
    texto:
      substituicao && sugestao?.trecho
        ? `“${sugestao.trecho}” → ${substituicao}`
        : sugestao?.mensagemCurta ||
          sugestao?.mensagem ||
          'Sugestão linguística.',
    categoria,
    tom: ortografia ? 'erro' : 'atencao',
  }
}
