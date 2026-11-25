import { listarTurmas } from './turmas.js'
import api from './api.js'
import { listarRedacoesDaTurmaComResumo } from './redacoes.js'
import { obterFeedbackProfessor } from './feedbacks.js'
import { resumirPainelProfessor } from '../utils/professor-dashboard.js'

export async function listarPrazosProfessor({ signal } = {}) {
  const resposta = await api.get('/api/professor/prazos', { signal })
  return resposta.data.data.prazos
}

async function consultarEmLotes(itens, consultar) {
  const resultados = []
  for (let inicio = 0; inicio < itens.length; inicio += 4) {
    resultados.push(...await Promise.all(itens.slice(inicio, inicio + 4).map(consultar)))
  }
  return resultados
}

export async function carregarPainelProfessor({ aoCarregarFila, signal } = {}) {
  const turmas = await listarTurmas()
  if (signal?.aborted) return null
  // Mesma rota de antes: a variante com resumo só deixa de descartar o
  // resumoEntregas, que dá a taxa de entrega sem nenhuma requisição a mais.
  const grupos = await consultarEmLotes(turmas, async (turma) => {
    const { redacoes, resumoEntregas } = await listarRedacoesDaTurmaComResumo(turma.id)
    return {
      turmaId: turma.id,
      resumoEntregas,
      redacoes: redacoes.map((redacao) => ({ ...redacao, turma })),
    }
  })
  const redacoes = grupos.flatMap((grupo) => grupo.redacoes)
  const entregas = Object.fromEntries(grupos.map((grupo) => [grupo.turmaId, grupo.resumoEntregas]))
  if (signal?.aborted) return null
  aoCarregarFila?.({ turmas, ...resumirPainelProfessor(turmas, redacoes, null, new Date(), entregas) })
  let feedbacks = []
  try {
    feedbacks = await consultarEmLotes(
      redacoes.filter((redacao) => redacao.status === 'AVALIADA'),
      (redacao) => obterFeedbackProfessor(redacao.id),
    )
  } catch {
    // Uma falha no histórico não deve aparecer como zero publicações.
    feedbacks = null
  }
  return { turmas, ...resumirPainelProfessor(turmas, redacoes, feedbacks, new Date(), entregas) }
}
