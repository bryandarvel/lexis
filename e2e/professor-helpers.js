// Apoio dos specs do professor (#66). Só contas e dados efêmeros criados pela fixture.
import { expect } from '@playwright/test'

// Mesmo bloqueio de rede dos demais specs: só o servidor local de teste (3100/5180) é acessível.
export async function bloquearRedeExterna(context) {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.hostname === '127.0.0.1' && ['3100', '5180'].includes(url.port)
      ? route.continue()
      : route.abort('blockedbyclient')
  })
}

// Turma extra do professor, registrada para a limpeza da fixture.
export async function novaTurma(cenario, nome, professor = cenario.professor) {
  const turma = (await cenario.chamada(professor, 'post', '/api/turmas', { nome }, 201)).turma
  cenario.registrarTurma(turma.id)
  return turma
}

export async function matricular(cenario, aluno, turma) {
  await cenario.chamada(aluno, 'post', '/api/turmas/entrar', { codigoAcesso: turma.codigoAcesso }, 201)
}

export async function novaProposta(cenario, turma, enunciado, professor = cenario.professor) {
  const { obterModeloCompetenciaDois } = await import('../backend/src/modules/temas/temas.competencia-dois.js')
  return (await cenario.chamada(professor, 'post', `/api/turmas/${turma.id}/temas`, {
    enunciado,
    descricao: 'Proposta fictícia de teste, sem conteúdo real.',
    prazoEntrega: new Date(Date.now() + 7 * 86400000).toISOString(),
    criterios: obterModeloCompetenciaDois().criterios,
  }, 201)).tema
}

// Critérios do modelo da Competência II, no formato aceito pela API.
export async function criteriosDoModelo() {
  const { obterModeloCompetenciaDois } = await import('../backend/src/modules/temas/temas.competencia-dois.js')
  return obterModeloCompetenciaDois().criterios
}

// Redação enviada pelo aluno pela API (a mesma rota do editor).
export async function enviarRedacaoPorApi(cenario, aluno, temaId, texto = 'Texto fictício enviado para o teste.') {
  await cenario.chamada(aluno, 'put', `/api/aluno/temas/${temaId}/redacao`, { texto })
  const enviada = (await cenario.chamada(aluno, 'post', `/api/aluno/temas/${temaId}/redacao/enviar`)).redacao
  expect(enviada.status).toBe('ENVIADA')
  return enviada
}

// Valor aceito por <input type="datetime-local"> (horário local do navegador), daqui a `dias`.
export function prazoParaCampo(dias) {
  const d = new Date(Date.now() + dias * 86400000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
