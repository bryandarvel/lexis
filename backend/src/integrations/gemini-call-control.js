import { AppError } from '../utils/app-error.js'

// Proteção em memória, compartilhada por todos os professores deste processo.
// Não coordena outros processos/máquinas nem substitui a cota do Google.
export function criarControleChamadasGemini({
  agora = () => Date.now(),
  intervaloMs = 20000,
  esperaLimiteMs = 60000,
} = {}) {
  let emAndamento = false
  let proximaChamadaEm = 0
  let falhasTemporarias = 0

  return {
    iniciar() {
      const restanteMs = proximaChamadaEm - agora()
      if (emAndamento || restanteMs > 0) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((emAndamento ? Math.max(intervaloMs, restanteMs) : restanteMs) / 1000),
        )
        throw new AppError(
          emAndamento
            ? 'Já existe uma solicitação ao Gemini em andamento neste servidor. Aguarde antes de solicitar outra análise.'
            : `Aguarde pelo menos ${retryAfterSeconds} segundos antes de solicitar outra análise. A nova tentativa ainda depende da disponibilidade e dos limites do serviço de IA.`,
          {
            statusCode: 503,
            code: emAndamento ? 'GEMINI_REQUEST_IN_PROGRESS' : 'GEMINI_COOLDOWN',
            details: { retryAfterSeconds },
          },
        )
      }
      emAndamento = true
      proximaChamadaEm = agora() + intervaloMs
    },

    registrarLimite(retryAfterSeconds = 0) {
      const esperaMs = Math.max(esperaLimiteMs, retryAfterSeconds * 1000)
      proximaChamadaEm = Math.max(proximaChamadaEm, agora() + esperaMs)
      return Math.max(1, Math.ceil((proximaChamadaEm - agora()) / 1000))
    },

    registrarIndisponibilidade(retryAfterSeconds = 0) {
      // Cada nova falha real aumenta a pausa; pedidos bloqueados não a renovam.
      falhasTemporarias = Math.min(falhasTemporarias + 1, 5)
      const esperaMs = Math.max(30000 * 2 ** (falhasTemporarias - 1), retryAfterSeconds * 1000)
      proximaChamadaEm = Math.max(proximaChamadaEm, agora() + esperaMs)
      return Math.max(1, Math.ceil((proximaChamadaEm - agora()) / 1000))
    },

    registrarSucesso() {
      falhasTemporarias = 0
    },

    concluir() {
      emAndamento = false
    },
  }
}

export const controleChamadasGemini = criarControleChamadasGemini()
