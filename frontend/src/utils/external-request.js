// Maiores que os limites máximos aceitos pelo backend (Gemini: 180s; OCR: 120s).
// A margem cobre transporte e persistência; requisições comuns mantêm 40s.
export const TIMEOUT_ANALISE_IA_MS = 200000
export const TIMEOUT_OCR_MS = 140000

export function obterEsperaMinimaAnalise(error, agora = Date.now()) {
  const dados = error?.response?.data?.error
  const codigo = dados?.code
  if (typeof codigo !== 'string' || (!codigo.startsWith('GEMINI_') && codigo !== 'AI_ANALYSIS_RATE_LIMIT_EXCEEDED')) return 0
  const segundos = dados.details?.retryAfterSeconds
  const ate = agora + segundos * 1000
  return Number.isSafeInteger(segundos) && segundos > 0 && Number.isSafeInteger(ate) ? ate : 0
}

export function segundosRestantesAnalise(ate, agora = Date.now()) {
  return Number.isFinite(ate) ? Math.max(0, Math.ceil((ate - agora) / 1000)) : 0
}

export function avisoAnaliseDuplicado(analise, aviso) {
  if (analise?.status !== 'ERRO' || aviso?.type !== 'error' || typeof analise.mensagemErro !== 'string') return false
  return mensagemErroAnalise(analise) === mensagemErroAnalise({ mensagemErro: aviso.message })
}

export function avisoEstadoAnalise(analise, { nova = false } = {}) {
  if (analise?.status === 'CONCLUIDA') return {
    type: nova ? 'success' : 'info',
    analiseId: analise.id,
    message: nova
      ? 'Nova análise concluída e salva. Revise as sugestões; nenhuma nota foi atribuída pela IA.'
      : 'Resultado salvo consultado. Esta consulta não solicitou uma nova análise à IA.',
  }
  if (analise?.status === 'ERRO') return { type: 'error', message: mensagemErroAnalise(analise) }
  return { type: 'info', message: analise ? 'Análise ainda em processamento. Consulte o resultado novamente em instantes.' : 'Nenhuma análise disponível.' }
}

export function avisoAtualDaAnalise(analise, aviso) {
  // Um aviso de sucesso só pertence à tentativa que realmente o produziu.
  if (aviso?.type === 'success' && (analise?.status !== 'CONCLUIDA' || aviso.analiseId !== analise.id)) return null
  return aviso
}

export function mensagemErroAnalise(analise) {
  // Prazos vivos vêm de details.retryAfterSeconds; uma mensagem histórica não reinicia a contagem.
  return analise?.mensagemErro?.replace(/^[A-Z][A-Z0-9_]*: /u, '')
    .replace(/ Aguarde pelo menos \d+ segundos antes de tentar novamente; esse prazo não garante a liberação da cota\.$/u, ' A espera informada naquela tentativa não garante a disponibilidade atual.')
    .replace(/^Aguarde pelo menos \d+ segundos antes de solicitar outra análise\. /u, '')
    || 'A análise não pôde ser concluída. Consulte o resultado antes de tentar novamente.'
}
