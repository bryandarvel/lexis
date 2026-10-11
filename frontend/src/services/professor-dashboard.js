import { listarTurmas } from './turmas.js'
import { listarRedacoesDaTurma } from './redacoes.js'
import { obterFeedbackProfessor } from './feedbacks.js'
import { resumirPainelProfessor } from '../utils/professor-dashboard.js'

async function consultarEmLotes(itens, consultar) {
  const resultados = []
  for (let inicio = 0; inicio < itens.length; inicio += 4) {
    resultados.push(...await Promise.all(itens.slice(inicio, inicio + 4).map(consultar)))
  }
  return resultados
}

export async function carregarPainelProfessor() {
  const turmas = await listarTurmas()
  const grupos = await consultarEmLotes(turmas, async (turma) => {
    const redacoes = await listarRedacoesDaTurma(turma.id)
    return redacoes.map((redacao) => ({ ...redacao, turma }))
  })
  const redacoes = grupos.flat()
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
  return { turmas, ...resumirPainelProfessor(turmas, redacoes, feedbacks) }
}
