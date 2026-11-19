import { normalizarBusca } from './professor-classes.js'

// Rótulos, ordenação e resumo da gestão da turma. Os efeitos descritos aqui
// seguem backend/src/modules/turmas: arquivar encerra todas as matrículas
// ativas e desvincular encerra apenas a matrícula do aluno; nos dois casos as
// redações e os feedbacks permanecem.

export function descreverSituacaoTurma(turma) {
  const ativa = turma?.ativa !== false

  return {
    ativa,
    rotulo: ativa ? 'Ativa' : 'Arquivada',
    // Toda alteração de turma exige turma ativa no backend.
    podeGerenciar: ativa,
  }
}

export function descreverSituacaoAluno(matricula) {
  if (matricula?.aluno?.ativo === false) {
    return { rotulo: 'Conta desativada', atencao: true }
  }

  if (matricula?.status === 'ENCERRADA') {
    return { rotulo: 'Matrícula encerrada', atencao: true }
  }

  return { rotulo: 'Matrícula ativa', atencao: false }
}

export function ordenarAlunosDaTurma(matriculas) {
  if (!Array.isArray(matriculas)) {
    return []
  }

  return [...matriculas].sort((primeira, segunda) => {
    const nomePrimeira = primeira?.aluno?.nome ?? ''
    const nomeSegunda = segunda?.aluno?.nome ?? ''
    const comparacao = nomePrimeira.localeCompare(nomeSegunda, 'pt-BR', {
      sensitivity: 'base',
    })

    if (comparacao !== 0) {
      return comparacao
    }

    return (primeira?.aluno?.email ?? '').localeCompare(
      segunda?.aluno?.email ?? '',
      'pt-BR',
    )
  })
}

export function resumirAlunosDaTurma(matriculas) {
  const lista = Array.isArray(matriculas) ? matriculas : []
  const desativados = lista.filter(
    (matricula) => matricula?.aluno?.ativo === false,
  ).length

  return {
    total: lista.length,
    desativados,
    rotulo: lista.length === 1 ? '1 aluno ativo' : `${lista.length} alunos ativos`,
  }
}


/*
 * Propostas da turma (Issue #175): filtro por situação, busca pelo enunciado e
 * ordem. As três situações já existiam na etiqueta do card; aqui elas também
 * decidem a ordem, para a proposta que ainda recebe redações vir antes da que
 * encerrou e da arquivada. Dentro de cada grupo, a mais recente primeiro.
 */

export const FILTROS_DE_PROPOSTA = [
  ['todas', 'Todas'],
  ['ativas', 'Ativas'],
  ['arquivadas', 'Arquivadas'],
]

export const STATUS_ARQUIVADO = 'Arquivado'
export const STATUS_ENCERRADO = 'Prazo encerrado'
export const STATUS_RECEBENDO = 'Recebendo redações'

// `new Date(null)` é 1970, não data inválida: sem este guarda, uma proposta
// sem prazo apareceria como encerrada.
function instanteDoPrazo(tema) {
  const prazo = tema?.prazoEntrega ? new Date(tema.prazoEntrega).getTime() : Number.NaN

  return Number.isFinite(prazo) ? prazo : null
}

export function obterStatusTema(tema, agora = Date.now()) {
  if (!tema?.ativo) return STATUS_ARQUIVADO

  const prazo = instanteDoPrazo(tema)

  return prazo !== null && prazo < agora ? STATUS_ENCERRADO : STATUS_RECEBENDO
}

const PESO_DO_STATUS = {
  [STATUS_RECEBENDO]: 0,
  [STATUS_ENCERRADO]: 1,
  [STATUS_ARQUIVADO]: 2,
}

// Prazo ausente não some da lista: vai para o fim do próprio grupo.
function ordemPorPrazo(tema) {
  return instanteDoPrazo(tema) ?? -Infinity
}

// Linha de resultado da busca. Só aparece quando o filtro ou a busca escondem
// alguma proposta: sem recorte, a contagem não acrescenta nada à lista.
export function descreverResultadoDasPropostas(visiveis, total) {
  if (visiveis >= total) return ''

  const plural = visiveis === 1 ? 'proposta' : 'propostas'

  return `${visiveis} ${plural} de ${total}.`
}

export function organizarPropostasDaTurma(
  temas,
  { busca = '', filtro = 'todas', agora = Date.now() } = {},
) {
  const termo = normalizarBusca(busca)
  const lista = (Array.isArray(temas) ? temas : []).filter((tema) => {
    const ativo = tema?.ativo !== false

    if (filtro === 'ativas' && !ativo) return false
    if (filtro === 'arquivadas' && ativo) return false

    return normalizarBusca(String(tema?.enunciado ?? '')).includes(termo)
  })

  return lista
    .map((tema, ordem) => ({ tema, ordem, status: obterStatusTema(tema, agora) }))
    .sort((a, b) => {
      const grupo = PESO_DO_STATUS[a.status] - PESO_DO_STATUS[b.status]

      if (grupo !== 0) return grupo

      const prazo = ordemPorPrazo(b.tema) - ordemPorPrazo(a.tema)

      // Empate de prazo preserva a ordem recebida, para a lista não dançar.
      return prazo || a.ordem - b.ordem
    })
    .map((item) => item.tema)
}
