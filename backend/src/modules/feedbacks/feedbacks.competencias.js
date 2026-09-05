export const CAMPOS_COMPETENCIAS = [
  'competencia1',
  'competencia2',
  'competencia3',
  'competencia4',
  'competencia5',
]

export function extrairCompetencias(dados) {
  return Object.fromEntries(
    CAMPOS_COMPETENCIAS.map((campo) => [
      campo,
      dados[campo],
    ]),
  )
}

export function calcularNotaTotalCompetencias(dados) {
  const notas = CAMPOS_COMPETENCIAS.map(
    (campo) => dados[campo],
  )

  if (notas.some((nota) => nota == null)) {
    return null
  }

  return notas.reduce(
    (total, nota) => total + nota,
    0,
  )
}
