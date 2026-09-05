function evidenciaPosicionalValida(
  evidencia,
  texto,
) {
  return (
    evidencia?.statusLocalizacao === 'LOCALIZADA' &&
    Number.isInteger(evidencia.inicio) &&
    Number.isInteger(evidencia.fim) &&
    evidencia.inicio >= 0 &&
    evidencia.fim > evidencia.inicio &&
    evidencia.fim <= texto.length &&
    texto.slice(evidencia.inicio, evidencia.fim) ===
      evidencia.trecho
  )
}

export function classificarEvidencia(evidencia) {
  if (typeof evidencia === 'string') {
    return {
      trecho: evidencia,
      status: 'LEGADA',
      rotulo:
        'Análise anterior: evidência sem posição no texto.',
    }
  }

  const rotulos = {
    LOCALIZADA: 'Marcada no texto.',
    AMBIGUA:
      'Trecho repetido: a posição não pôde ser determinada com segurança.',
    NAO_LOCALIZADA:
      'Trecho não localizado: revise esta sugestão da IA.',
  }
  const status =
    evidencia?.statusLocalizacao ?? 'DESCONHECIDA'

  return {
    trecho:
      evidencia?.trecho ?? 'Evidência indisponível.',
    status,
    rotulo:
      rotulos[status] ??
      'A localização desta evidência é desconhecida.',
  }
}

export function resumirEvidencias(
  analisePorCriterio = [],
) {
  const resumo = {
    localizadas: 0,
    ambiguas: 0,
    naoLocalizadas: 0,
    legadas: 0,
  }

  for (const criterio of analisePorCriterio) {
    for (const evidencia of criterio.evidencias ?? []) {
      const { status } = classificarEvidencia(evidencia)

      if (status === 'LOCALIZADA') {
        resumo.localizadas += 1
      } else if (status === 'AMBIGUA') {
        resumo.ambiguas += 1
      } else if (status === 'NAO_LOCALIZADA') {
        resumo.naoLocalizadas += 1
      } else {
        resumo.legadas += 1
      }
    }
  }

  return resumo
}

export function segmentarTextoComEvidencias(
  texto,
  analisePorCriterio = [],
) {
  if (!texto) {
    return []
  }

  const marcacoes = []
  const chaves = new Set()

  for (const criterio of analisePorCriterio) {
    for (const evidencia of criterio.evidencias ?? []) {
      if (!evidenciaPosicionalValida(evidencia, texto)) {
        continue
      }

      const chave = [
        evidencia.inicio,
        evidencia.fim,
        criterio.ordem,
      ].join(':')

      if (chaves.has(chave)) {
        continue
      }

      chaves.add(chave)
      marcacoes.push({
        inicio: evidencia.inicio,
        fim: evidencia.fim,
        criterioOrdem: criterio.ordem,
      })
    }
  }

  if (marcacoes.length === 0) {
    return [
      {
        inicio: 0,
        fim: texto.length,
        texto,
        criterios: [],
      },
    ]
  }

  const limites = [
    0,
    texto.length,
    ...marcacoes.flatMap((item) => [
      item.inicio,
      item.fim,
    ]),
  ]
  const pontos = [...new Set(limites)].sort(
    (a, b) => a - b,
  )

  return pontos.slice(0, -1).map((inicio, indice) => {
    const fim = pontos[indice + 1]
    const criterios = [
      ...new Set(
        marcacoes
          .filter(
            (item) =>
              item.inicio <= inicio && item.fim >= fim,
          )
          .map((item) => item.criterioOrdem),
      ),
    ].sort((a, b) => a - b)

    return {
      inicio,
      fim,
      texto: texto.slice(inicio, fim),
      criterios,
    }
  })
}
