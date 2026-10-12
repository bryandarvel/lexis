import { validarCriteriosTema } from './topic-form.js'

const nomeNormalizado = (nome) => nome.trim().normalize('NFC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')

export function agruparCriteriosProposta(criterios, modelo) {
  const nomesBase = new Set(modelo.criterios.map((criterio) => nomeNormalizado(criterio.nome)))
  const base = modelo.criterios.map((referencia) => {
    const salvo = criterios.find((criterio) => nomeNormalizado(criterio.nome) === nomeNormalizado(referencia.nome))
    return { ...(salvo ?? referencia), sincronizado: Boolean(salvo) }
  })
  const personalizados = criterios.filter((criterio) => !nomesBase.has(nomeNormalizado(criterio.nome)))
  return { base, personalizados, compativel: base.every((criterio) => criterio.sincronizado) && personalizados.length <= 2 }
}

export function prepararCriterioPersonalizado(criterios, modelo, indice, novo) {
  const grupos = agruparCriteriosProposta(criterios, modelo)
  if (!grupos.compativel) return { erro: 'Esta proposta usa uma configuração anterior. Nenhum critério será alterado automaticamente.' }
  if (indice !== null && (!Number.isInteger(indice) || indice < 0 || indice >= grupos.personalizados.length)) {
    return { erro: 'O critério selecionado não está disponível.' }
  }
  if (indice === null && grupos.personalizados.length >= 2) return { erro: 'Esta proposta já possui dois critérios personalizados.' }
  const criterio = { nome: novo.nome.trim().replace(/\s+/g, ' '), descricao: novo.descricao.trim() }
  if (criterio.nome.length > 120 || criterio.descricao.length > 2000) return { erro: 'Use até 120 caracteres no nome e 2.000 na descrição.' }
  const alvo = indice === null ? null : grupos.personalizados[indice]
  // Preserva ordem e conteúdo dos critérios fixos; nunca migra dados legados silenciosamente.
  const resultado = criterios.map((original) => original === alvo ? criterio : { nome: original.nome, descricao: original.descricao })
  if (indice === null) resultado.push(criterio)
  const erro = validarCriteriosTema(resultado)
  return erro ? { erro } : { criterios: resultado }
}

export function obterPublicacaoFeedback(feedback) {
  return (feedback?.historico ?? []).filter((versao) => versao.status === 'PUBLICADA')
    .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0))[0] ?? null
}

export function resumirEntregasProposta(redacoes) {
  const entregues = redacoes.filter((redacao) => ['ENVIADA', 'AVALIADA'].includes(redacao.status))
  return {
    redacoes: entregues,
    alunos: new Set(entregues.map((redacao) => redacao.aluno?.id ?? redacao.alunoId ?? redacao.id)).size,
  }
}
