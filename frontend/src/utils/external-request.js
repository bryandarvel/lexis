// Maiores que os limites máximos aceitos pelo backend (Gemini: 180s; OCR: 120s).
// A margem cobre transporte e persistência; requisições comuns mantêm 40s.
export const TIMEOUT_ANALISE_IA_MS = 200000
export const TIMEOUT_OCR_MS = 140000

export function avisoEstadoAnalise(analise) {
  if (analise?.status === 'CONCLUIDA') return { type: 'success', message: 'Análise disponível para revisão. Nenhuma nota foi atribuída pela IA.' }
  if (analise?.status === 'ERRO') return { type: 'error', message: 'A análise não foi concluída. Consulte a mensagem do serviço antes de tentar novamente.' }
  return { type: 'info', message: analise ? 'Análise ainda em processamento. Consulte o resultado novamente em instantes.' : 'Nenhuma análise disponível.' }
}
