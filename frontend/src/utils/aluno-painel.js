const STATUS_ENTREGUES = new Set([
  'ENVIADA',
  'AVALIADA',
])

const MINUTO_MS = 60_000
const HORA_MS = 60 * MINUTO_MS
const DIA_MS = 24 * HORA_MS

function converterData(valor) {
  if (!valor) {
    return null
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime())
    ? null
    : data
}

function obterPartesData(data, opcoes) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', opcoes)
      .formatToParts(data)
      .map(({ type, value }) => [type, value]),
  )
}

export function obterIniciais(nome) {
  const palavras = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (palavras.length === 0) {
    return '?'
  }

  const primeira = palavras[0]
  const ultima = palavras.length > 1
    ? palavras.at(-1)
    : ''

  return `${primeira[0]}${ultima[0] ?? ''}`
    .toLocaleUpperCase('pt-BR')
}

export function descreverTurma(turma) {
  if (!turma?.nome) {
    return ''
  }

  return turma.professor?.nome
    ? `${turma.nome} · Prof. ${turma.professor.nome}`
    : turma.nome
}

export function selecionarPropostaAberta(
  temas,
  redacoes,
  agora = new Date(),
) {
  if (!Array.isArray(temas)) {
    return null
  }

  const temasEntregues = new Set(
    (Array.isArray(redacoes) ? redacoes : [])
      .filter((redacao) =>
        STATUS_ENTREGUES.has(redacao.status),
      )
      .map((redacao) => redacao.temaId),
  )

  const abertas = temas
    .map((tema) => ({
      tema,
      prazo: converterData(tema.prazoEntrega),
    }))
    .filter(
      ({ tema, prazo }) =>
        prazo &&
        prazo.getTime() >= agora.getTime() &&
        !temasEntregues.has(tema.id),
    )
    .sort(
      (a, b) =>
        a.prazo.getTime() - b.prazo.getTime() ||
        String(a.tema.enunciado).localeCompare(
          String(b.tema.enunciado),
          'pt-BR',
        ),
    )

  return abertas[0]?.tema ?? null
}

export function encontrarRascunhoDoTema(
  redacoes,
  temaId,
) {
  if (!Array.isArray(redacoes) || !temaId) {
    return null
  }

  return (
    redacoes.find(
      (redacao) =>
        redacao.temaId === temaId &&
        redacao.status === 'RASCUNHO',
    ) ?? null
  )
}

export function formatarPrazoEntrega(valor) {
  const data = converterData(valor)

  if (!data) {
    return 'Prazo indisponível'
  }

  const partes = obterPartesData(data, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  return `${partes.day}/${partes.month}/${partes.year}, ${partes.hour}h${partes.minute}`
}

export function formatarDiaMes(valor) {
  const data = converterData(valor)

  if (!data) {
    return null
  }

  const partes = obterPartesData(data, {
    day: '2-digit',
    month: '2-digit',
  })

  return `${partes.day}/${partes.month}`
}

export function descreverTempoDesde(
  valor,
  agora = new Date(),
) {
  const data = converterData(valor)

  if (!data) {
    return null
  }

  const decorrido = agora.getTime() - data.getTime()

  if (decorrido < MINUTO_MS) {
    return 'agora há pouco'
  }

  const formatador = new Intl.RelativeTimeFormat(
    'pt-BR',
    {
      numeric: 'always',
    },
  )

  if (decorrido < HORA_MS) {
    return formatador.format(
      -Math.floor(decorrido / MINUTO_MS),
      'minute',
    )
  }

  if (decorrido < DIA_MS) {
    return formatador.format(
      -Math.floor(decorrido / HORA_MS),
      'hour',
    )
  }

  return formatador.format(
    -Math.floor(decorrido / DIA_MS),
    'day',
  )
}

export function descreverRedacao(redacao) {
  const destinoEditor =
    `/aluno/temas/${encodeURIComponent(redacao.temaId)}/redacao`

  if (redacao.status === 'AVALIADA') {
    const publicadaEm = formatarDiaMes(
      redacao.publicadoEm,
    )
    const possuiNota = Number.isInteger(
      redacao.notaPublicada,
    )

    return {
      faixa: 'sucesso',
      legenda: publicadaEm
        ? `Publicada em ${publicadaEm}`
        : 'Correção publicada',
      nota: possuiNota
        ? {
            texto: `Nota ${redacao.notaPublicada}/1000`,
            tom: 'sucesso',
          }
        : {
            texto: 'Sem nota',
            tom: 'neutro',
          },
      acao: {
        rotulo: 'Ver feedback',
        destino: `/aluno/redacoes/${encodeURIComponent(redacao.id)}/feedback`,
        variante: 'suave',
      },
    }
  }

  if (redacao.status === 'ENVIADA') {
    const enviadaEm = formatarDiaMes(
      redacao.enviadaEm,
    )

    return {
      faixa: 'neutro',
      legenda: enviadaEm
        ? `Em correção desde ${enviadaEm}`
        : 'Em correção',
      nota: {
        texto: 'Sem nota',
        tom: 'atencao',
      },
      acao: {
        rotulo: 'Acompanhar',
        destino: destinoEditor,
        variante: 'contorno',
      },
    }
  }

  return {
    faixa: 'neutro',
    legenda: 'Rascunho salvo · não entregue',
    nota: {
      texto: 'Sem nota',
      tom: 'neutro',
    },
    acao: {
      rotulo: 'Continuar',
      destino: destinoEditor,
      variante: 'contorno',
    },
  }
}

export function formatarIndicador(valor) {
  return Number.isFinite(valor)
    ? Math.round(valor).toLocaleString('pt-BR')
    : null
}

export function calcularPercentual(valor, maximo) {
  if (
    !Number.isFinite(valor) ||
    !Number.isFinite(maximo) ||
    maximo <= 0
  ) {
    return 0
  }

  return Math.min(
    100,
    Math.max(0, (valor / maximo) * 100),
  )
}
