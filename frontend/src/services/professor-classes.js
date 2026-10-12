import { listarTurmas } from './turmas.js'
import { listarRedacoesDaTurma } from './redacoes.js'
import { resumirRedacoesTurma } from '../utils/professor-classes.js'

export async function carregarTurmasProfessor() {
  const turmas = await listarTurmas()
  const resultado = []
  for (let inicio = 0; inicio < turmas.length; inicio += 4) {
    const lote = await Promise.all(turmas.slice(inicio, inicio + 4).map(async (turma) => {
      try {
        const redacoes = await listarRedacoesDaTurma(turma.id)
        return { ...turma, resumo: resumirRedacoesTurma(redacoes) }
      } catch {
        // Não representar falha de consulta como zero pendências.
        return { ...turma, resumo: null }
      }
    }))
    resultado.push(...lote)
  }
  return resultado
}
