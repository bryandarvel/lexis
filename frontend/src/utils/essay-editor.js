export const LIMITE_CARACTERES_REDACAO = 20_000
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
