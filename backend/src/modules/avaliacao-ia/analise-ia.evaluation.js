function dividir(numerador, denominador) {
  return denominador === 0
    ? null
    : Number((numerador / denominador).toFixed(4))
}

function chaveEvidencia({ criterioOrdem, inicio, fim }) {
  return `${criterioOrdem}:${inicio}:${fim}`
}

function evidenciasPrevistas(resultado) {
  return resultado.analisePorCriterio.flatMap(
    (criterio) =>
      criterio.evidencias
        .filter(
          (evidencia) =>
            evidencia.statusLocalizacao === 'LOCALIZADA',
        )
        .map((evidencia) => ({
          criterioOrdem: criterio.ordem,
          inicio: evidencia.inicio,
          fim: evidencia.fim,
          trecho: evidencia.trecho,
        })),
  )
}

export function compararEvidencias({
  resultado,
  referenciaHumana,
}) {
  const previstas = evidenciasPrevistas(resultado)
  const referencias = referenciaHumana.evidencias
  const chavesPrevistas = new Set(
    previstas.map(chaveEvidencia),
  )
  const chavesReferencia = new Set(
    referencias.map(chaveEvidencia),
  )

  const verdadeirosPositivos = previstas.filter(
    (evidencia) =>
      chavesReferencia.has(chaveEvidencia(evidencia)),
  ).length
  const falsosPositivos = previstas.length - verdadeirosPositivos
  const falsosNegativos = referencias.filter(
    (evidencia) =>
      !chavesPrevistas.has(chaveEvidencia(evidencia)),
  ).length

  const ambiguas = resultado.analisePorCriterio.reduce(
    (total, criterio) =>
      total +
      criterio.evidencias.filter(
        (evidencia) =>
          evidencia.statusLocalizacao === 'AMBIGUA',
      ).length,
    0,
  )
  const naoLocalizadas = resultado.analisePorCriterio.reduce(
    (total, criterio) =>
      total +
      criterio.evidencias.filter(
        (evidencia) =>
          evidencia.statusLocalizacao === 'NAO_LOCALIZADA',
      ).length,
    0,
  )

  return {
    verdadeirosPositivos,
    falsosPositivos,
    falsosNegativos,
    ambiguas,
    naoLocalizadas,
  }
}

export function resumirAvaliacoes(casos) {
  const totais = casos.reduce(
    (acumulado, caso) => ({
      respostasValidas:
        acumulado.respostasValidas +
        (caso.status === 'VALIDA' ? 1 : 0),
      respostasInvalidas:
        acumulado.respostasInvalidas +
        (caso.status === 'INVALIDA' ? 1 : 0),
      falhas: acumulado.falhas + (caso.status === 'FALHA' ? 1 : 0),
      verdadeirosPositivos:
        acumulado.verdadeirosPositivos +
        caso.metricasEvidencias.verdadeirosPositivos,
      falsosPositivos:
        acumulado.falsosPositivos +
        caso.metricasEvidencias.falsosPositivos,
      falsosNegativos:
        acumulado.falsosNegativos +
        caso.metricasEvidencias.falsosNegativos,
      ambiguas:
        acumulado.ambiguas + caso.metricasEvidencias.ambiguas,
      naoLocalizadas:
        acumulado.naoLocalizadas +
        caso.metricasEvidencias.naoLocalizadas,
      latenciaTotalMs:
        acumulado.latenciaTotalMs + caso.latenciaMs,
    }),
    {
      respostasValidas: 0,
      respostasInvalidas: 0,
      falhas: 0,
      verdadeirosPositivos: 0,
      falsosPositivos: 0,
      falsosNegativos: 0,
      ambiguas: 0,
      naoLocalizadas: 0,
      latenciaTotalMs: 0,
    },
  )

  const precisao = dividir(
    totais.verdadeirosPositivos,
    totais.verdadeirosPositivos + totais.falsosPositivos,
  )
  const revocacao = dividir(
    totais.verdadeirosPositivos,
    totais.verdadeirosPositivos + totais.falsosNegativos,
  )
  const f1 =
    precisao === null ||
    revocacao === null ||
    precisao + revocacao === 0
      ? null
      : Number(
          ((2 * precisao * revocacao) / (precisao + revocacao)).toFixed(4),
        )

  return {
    casos: casos.length,
    ...totais,
    taxaRespostasInvalidas: dividir(
      totais.respostasInvalidas,
      casos.length,
    ),
    latenciaMediaMs: dividir(totais.latenciaTotalMs, casos.length),
    precisaoEvidencias: precisao,
    revocacaoEvidencias: revocacao,
    f1Evidencias: f1,
    concordanciaNotas: {
      status: 'NAO_APLICAVEL',
      motivo:
        'A análise consultiva da LÉXIS não atribui notas numéricas.',
    },
  }
}
