export const COMPETENCIAS_ENEM = [
  {
    campo: 'competencia1',
    numero: 'I',
    titulo:
      'Domínio da modalidade escrita formal da língua portuguesa',
  },
  {
    campo: 'competencia2',
    numero: 'II',
    titulo:
      'Compreensão da proposta e aplicação de conhecimentos para desenvolver o tema',
  },
  {
    campo: 'competencia3',
    numero: 'III',
    titulo:
      'Seleção e organização de argumentos em defesa de um ponto de vista',
  },
  {
    campo: 'competencia4',
    numero: 'IV',
    titulo:
      'Conhecimento dos mecanismos linguísticos necessários à argumentação',
  },
  {
    campo: 'competencia5',
    numero: 'V',
    titulo:
      'Proposta de intervenção que respeite os direitos humanos',
  },
]

export function calcularNotaTotalCompetencias(dados) {
  const notas = COMPETENCIAS_ENEM.map(
    ({ campo }) => dados?.[campo],
  )

  if (
    notas.some(
      (nota) => !Number.isInteger(nota),
    )
  ) {
    return null
  }

  return notas.reduce(
    (total, nota) => total + nota,
    0,
  )
}
