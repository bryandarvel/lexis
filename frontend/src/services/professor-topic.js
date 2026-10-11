import { obterTemaProfessor, listarTemasDaTurma, obterModeloCompetenciaDois } from './temas.js'
import { obterTurma } from './turmas.js'
import { listarRedacoesDaTurma } from './redacoes.js'
import { obterFeedbackProfessor } from './feedbacks.js'
import { obterPublicacaoFeedback, resumirEntregasProposta } from '../utils/professor-topic.js'

export async function carregarPropostaProfessor(temaId) {
  const tema = await obterTemaProfessor(temaId)
  const turmaId = tema.turma?.id ?? tema.turmaId
  const [turma, temas, modelo, recebidas] = await Promise.all([
    obterTurma(turmaId), listarTemasDaTurma(turmaId), obterModeloCompetenciaDois(),
    listarRedacoesDaTurma(turmaId, { temaId }),
  ])
  const { redacoes, alunos } = resumirEntregasProposta(recebidas)
  const avaliadas = redacoes.filter((redacao) => redacao.status === 'AVALIADA')
  const publicacoes = new Map()
  for (let inicio = 0; inicio < avaliadas.length; inicio += 4) {
    await Promise.all(avaliadas.slice(inicio, inicio + 4).map(async (redacao) => {
      try {
        publicacoes.set(redacao.id, obterPublicacaoFeedback(await obterFeedbackProfessor(redacao.id)))
      } catch {
        // A consulta da nota é opcional: uma falha não vira nota zero ou publicação fictícia.
        publicacoes.set(redacao.id, null)
      }
    }))
  }
  return { tema, turma, temas: temas.some((item) => item.id === tema.id) ? temas : [tema, ...temas], modelo,
    alunos, redacoes: redacoes.map((redacao) => ({ ...redacao, publicacao: publicacoes.get(redacao.id) ?? null })) }
}
