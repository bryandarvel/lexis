import { COMPETENCIAS_ENEM, calcularNotaTotalCompetencias } from '../constants/competencias-enem.js'
import { segmentarTextoComEvidencias } from './ai-evidence.js'

const normalizar = (texto) => String(texto ?? '').trim().normalize('NFC').toLocaleLowerCase('pt-BR')
const BASE = ['legitimação', 'pertinência', 'uso produtivo']

export function criterioFixo(criterio) { return BASE.includes(normalizar(criterio.nome)) }

export function tomCriterio(criterio, indice = 0) {
  const base = BASE.indexOf(normalizar(criterio.nome))
  return base >= 0 ? base : 3 + Math.max(0, indice - 3) % 2
}

export function criarFormularioFeedback(redacao, feedback) {
  const atual = feedback?.versaoAtual
  const comentarios = new Map((atual?.criterios ?? []).map((item) => [item.criterioId, item.comentario]))
  return {
    ...Object.fromEntries(COMPETENCIAS_ENEM.map(({ campo }) => [campo, atual?.[campo] == null ? '' : String(atual[campo])])),
    legacyScore: !COMPETENCIAS_ENEM.some(({ campo }) => atual?.[campo] != null) && atual?.nota != null ? String(atual.nota) : '',
    generalComment: atual?.comentarioGeral ?? '',
    criterionComments: Object.fromEntries((redacao.tema.criterios ?? []).map((c) => [c.id, comentarios.get(c.id) ?? ''])),
    criterionReviewed: {},
  }
}

export function montarDadosFeedback(form) {
  return {
    ...Object.fromEntries(COMPETENCIAS_ENEM.map(({ campo }) => {
      const texto = String(form[campo] ?? '').trim()
      return [campo, texto === '' ? null : Number(texto)]
    })),
    comentarioGeral: form.generalComment.trim() || null,
    criterios: Object.entries(form.criterionComments).filter(([, c]) => c.trim()).map(([criterioId, c]) => ({ criterioId, comentario: c.trim() })),
  }
}

export function validarFeedback(dados, publicar = false) {
  if (!COMPETENCIAS_ENEM.every(({ campo }) => dados[campo] == null || (Number.isInteger(dados[campo]) && dados[campo] >= 0 && dados[campo] <= 200))) {
    return 'Cada competência precisa ter uma nota inteira entre 0 e 200.'
  }
  if (publicar && (calcularNotaTotalCompetencias(dados) == null || !dados.comentarioGeral)) return 'Preencha as cinco competências e o comentário geral antes de publicar.'
  if ((dados.comentarioGeral?.length ?? 0) > 10000 || dados.criterios.some((c) => c.comentario.length > 5000)) return 'Respeite os limites de 10.000 caracteres no comentário geral e 5.000 por critério.'
  return ''
}

export function sugestaoDoCriterio(analise, criterio) {
  if (analise?.status !== 'CONCLUIDA') return null
  // Não associa uma sugestão apenas pela posição: análises antigas podem ter outro conjunto de critérios.
  return analise.resultadoEstruturado?.analisePorCriterio?.find((c) => c.ordem === criterio.ordem && normalizar(c.criterio) === normalizar(criterio.nome)) ?? null
}

export function comentarioEditavel(form, analise, criterio) {
  const comentario = form.criterionComments[criterio.id] ?? ''
  const sugestao = sugestaoDoCriterio(analise, criterio)
  const sugerido = Boolean(sugestao && !comentario && !form.criterionReviewed?.[criterio.id])
  return { texto: sugerido ? sugestao.diagnostico : comentario, sugerido }
}

export function atualizarComentario(form, id, texto) {
  return { ...form, criterionComments: { ...form.criterionComments, [id]: texto },
    criterionReviewed: { ...form.criterionReviewed, [id]: true } }
}

export function evidenciasVerificadas(texto, analise) {
  const criterios = analise?.status === 'CONCLUIDA' ? analise.resultadoEstruturado?.analisePorCriterio ?? [] : []
  const segmentos = segmentarTextoComEvidencias(texto, criterios)
  const trechos = new Map()
  for (const criterio of criterios) {
    for (const e of criterio.evidencias ?? []) {
      if (e?.statusLocalizacao !== 'LOCALIZADA' || !Number.isInteger(e.inicio) || !Number.isInteger(e.fim) || e.inicio < 0 || e.fim <= e.inicio || e.fim > texto.length || texto.slice(e.inicio, e.fim) !== e.trecho) continue
      const chave = `${e.inicio}-${e.fim}`
      if (!trechos.has(chave)) trechos.set(chave, { ...e, ordens: [] })
      if (!trechos.get(chave).ordens.includes(criterio.ordem)) trechos.get(chave).ordens.push(criterio.ordem)
    }
  }
  return { segmentos, trechos: [...trechos.values()].sort((a, b) => a.inicio - b.inicio) }
}

export function organizarFila(redacoes, atualId) {
  const lista = redacoes.filter((r) => ['ENVIADA', 'AVALIADA'].includes(r.status))
    .sort((a, b) => String(a.enviadaEm).localeCompare(String(b.enviadaEm)) || a.id.localeCompare(b.id))
  const indice = lista.findIndex((r) => r.id === atualId)
  const seguintes = indice < 0 ? [] : [...lista.slice(indice + 1), ...lista.slice(0, indice)]
  return { posicao: indice < 0 ? null : indice + 1, total: lista.length, proxima: seguintes.find((r) => r.status === 'ENVIADA') ?? null }
}
