// Situação, filtro, ordenação e resumo da lista "Minhas redações". O contrato
// vem de GET /api/aluno/redacoes: status RASCUNHO, ENVIADA ou AVALIADA, mais
// notaPublicada e publicadoEm (null enquanto não há correção publicada).

export const FILTROS_SITUACAO = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'RASCUNHO', rotulo: 'Rascunhos' },
  { valor: 'ENVIADA', rotulo: 'Aguardando correção' },
  { valor: 'AVALIADA', rotulo: 'Corrigidas' },
]

export const ORDENACOES = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigas', rotulo: 'Mais antigas' },
  { valor: 'maior-nota', rotulo: 'Maior nota' },
  { valor: 'menor-nota', rotulo: 'Menor nota' },
]

const SITUACOES = {
  RASCUNHO: { rotulo: 'Rascunho', tom: 'neutro' },
  ENVIADA: { rotulo: 'Aguardando correção', tom: 'atencao' },
  AVALIADA: { rotulo: 'Corrigida', tom: 'sucesso' },
}

function converterData(valor) {
  if (!valor) {
    return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data
}

// AVALIADA sem nota publicada é possível no contrato: a correção existe, mas a
// nota ainda não está disponível para o aluno.
export function descreverSituacao(redacao) {
  const base = SITUACOES[redacao?.status] ?? {
    rotulo: 'Situação indisponível',
    tom: 'neutro',
  }

  if (
    redacao?.status === 'AVALIADA' &&
    !Number.isInteger(redacao.notaPublicada)
  ) {
    return { rotulo: 'Corrigida, nota indisponível', tom: 'atencao' }
  }

  return base
}

export function temNotaPublicada(redacao) {
  return (
    redacao?.status === 'AVALIADA' &&
    Number.isInteger(redacao.notaPublicada)
  )
}

// A lista traz as redações de todas as turmas, inclusive as que o aluno deixou.
// O editor só abre para um rascunho da turma da matrícula atual e de proposta
// ativa, que é o que o backend aceita para escrever. O prazo vencido não
// bloqueia: a entrega com atraso é permitida, como no painel, e o item só
// ganha um aviso.
export function descreverDestino(
  redacao,
  { turmaAtualId = null, agora = new Date() } = {},
) {
  const tema = redacao?.tema

  if (!redacao?.id) {
    return { tipo: 'nenhum', motivo: '' }
  }

  if (temNotaPublicada(redacao)) {
    return {
      tipo: 'feedback',
      para: `/aluno/redacoes/${encodeURIComponent(redacao.id)}/feedback`,
      rotulo: 'Ver feedback',
    }
  }

  if (redacao.status === 'RASCUNHO') {
    if (!turmaAtualId || tema?.turma?.id !== turmaAtualId) {
      return {
        tipo: 'nenhum',
        motivo: 'Você saiu desta turma. O rascunho fica salvo, mas só volta a ser editável se você entrar de novo nela.',
      }
    }

    if (tema?.ativo === false) {
      return { tipo: 'nenhum', motivo: 'Esta proposta foi arquivada.' }
    }

    const prazo = converterData(tema?.prazoEntrega)
    const vencido = Boolean(prazo && prazo.getTime() < agora.getTime())

    return {
      tipo: 'editor',
      para: `/aluno/temas/${encodeURIComponent(redacao.temaId)}/redacao`,
      rotulo: 'Continuar escrevendo',
      ...(vencido && {
        aviso: 'O prazo já terminou. A entrega será registrada com atraso.',
      }),
    }
  }

  return {
    tipo: 'nenhum',
    motivo:
      redacao.status === 'ENVIADA'
        ? 'Sua professora ainda vai corrigir esta redação.'
        : '',
  }
}

export function filtrarRedacoes(redacoes, filtro = 'todas') {
  const lista = Array.isArray(redacoes) ? redacoes : []

  if (filtro === 'todas') {
    return lista
  }

  return lista.filter((redacao) => redacao.status === filtro)
}

function momentoDaRedacao(redacao) {
  const data =
    converterData(redacao.enviadaEm) ??
    converterData(redacao.atualizadoEm) ??
    converterData(redacao.criadoEm)

  return data ? data.getTime() : 0
}

export function ordenarRedacoes(redacoes, ordenacao = 'recentes') {
  const lista = Array.isArray(redacoes) ? [...redacoes] : []
  const porData = (a, b) => momentoDaRedacao(b) - momentoDaRedacao(a)
  const nota = (redacao) =>
    temNotaPublicada(redacao) ? redacao.notaPublicada : null

  if (ordenacao === 'antigas') {
    return lista.sort((a, b) => -porData(a, b))
  }

  if (ordenacao === 'maior-nota' || ordenacao === 'menor-nota') {
    const sinal = ordenacao === 'maior-nota' ? -1 : 1

    // Sem nota publicada vai sempre para o fim, nas duas direções.
    return lista.sort((a, b) => {
      const notaA = nota(a)
      const notaB = nota(b)

      if (notaA === null && notaB === null) return porData(a, b)
      if (notaA === null) return 1
      if (notaB === null) return -1

      return sinal * (notaA - notaB) || porData(a, b)
    })
  }

  return lista.sort(porData)
}

export function resumirRedacoes(redacoes) {
  const lista = Array.isArray(redacoes) ? redacoes : []
  const contar = (status) =>
    lista.filter((redacao) => redacao.status === status).length

  return {
    total: lista.length,
    rascunhos: contar('RASCUNHO'),
    aguardando: contar('ENVIADA'),
    corrigidas: contar('AVALIADA'),
  }
}

export function descreverResultado(visiveis, total, filtro) {
  if (total === 0) {
    return 'Nenhuma redação.'
  }

  const nome = visiveis === 1 ? 'redação' : 'redações'

  if (filtro === 'todas') {
    return `${visiveis} ${nome}.`
  }

  return `${visiveis} ${nome} de ${total}.`
}

export function formatarDataRedacao(redacao) {
  const data =
    converterData(redacao?.enviadaEm) ??
    converterData(redacao?.atualizadoEm)

  if (!data) {
    return null
  }

  const texto = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(data)

  return redacao?.enviadaEm
    ? `Enviada em ${texto}`
    : `Salva em ${texto}`
}
