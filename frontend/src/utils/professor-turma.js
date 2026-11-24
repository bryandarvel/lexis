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

/*
 * Onde a busca encontrou a proposta (Issue #194). A listagem deixou de
 * mostrar a descrição, mas a busca passou a olhar dentro dela e das
 * orientações: sem esta pista, a proposta apareceria no resultado sem que o
 * termo estivesse em nada visível no cartão.
 */
export const CAMPOS_DE_BUSCA_DA_PROPOSTA = [
  ['enunciado', 'no enunciado'],
  ['descricao', 'na descrição'],
  ['instrucoes', 'nas orientações'],
]

function textoDoCampo(tema, campo) {
  return normalizarBusca(String(tema?.[campo] ?? ''))
}

export function ondeABuscaEncontrou(tema, busca = '') {
  const termo = normalizarBusca(busca)

  if (!termo) return ''

  const achado = CAMPOS_DE_BUSCA_DA_PROPOSTA.find(([campo]) => textoDoCampo(tema, campo).includes(termo))

  // Só avisa quando o enunciado, que é o que o cartão mostra, não tem o termo.
  return !achado || achado[0] === 'enunciado' ? '' : `Encontrada ${achado[1]} da proposta.`
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

    if (!termo) return true

    // Issue #194: busca também no que o cartão deixou de mostrar.
    return CAMPOS_DE_BUSCA_DA_PROPOSTA.some(([campo]) => textoDoCampo(tema, campo).includes(termo))
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

/*
 * Busca de alunos na turma (Issue #194). A grade substituiu a lista, e em 15
 * ou mais cartões achar um aluno pelo olho deixa de ser viável. Mesmo
 * normalizador das outras buscas do professor: ignora acento e caixa.
 */
export function filtrarAlunosDaTurma(matriculas, busca = '') {
  const termo = normalizarBusca(busca)
  const lista = Array.isArray(matriculas) ? matriculas : []

  if (!termo) return lista

  return lista.filter((matricula) =>
    normalizarBusca(`${matricula?.aluno?.nome ?? ''} ${matricula?.aluno?.email ?? ''}`).includes(termo),
  )
}

// Igual à das propostas: a contagem só aparece quando a busca esconde alguém.
export function descreverResultadoDosAlunos(visiveis, total) {
  if (visiveis >= total) return ''

  return `${visiveis} ${visiveis === 1 ? 'aluno' : 'alunos'} de ${total}.`
}
