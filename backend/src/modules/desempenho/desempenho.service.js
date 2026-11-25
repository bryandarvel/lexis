import {
  buscarDesempenhoDoAluno,
} from './desempenho.repository.js'
import {
  desempenhoAlunoSchema,
} from './desempenho.schemas.js'

function arredondarMedia(valor) {
  if (!Number.isFinite(valor)) {
    return null
  }

  return Math.round(valor * 10) / 10
}

export async function obterDesempenhoParaAluno(
  {
    alunoId,
  },
  {
    buscar = buscarDesempenhoDoAluno,
  } = {},
) {
  const resultado = await buscar({
    alunoId,
  })
  const possuiCorrecaoPublicada =
    resultado.totalCorrigidas > 0

  return desempenhoAlunoSchema.parse({
    mediaGeral: possuiCorrecaoPublicada
      ? arredondarMedia(resultado.mediaNota)
      : null,
    ultimaNota: possuiCorrecaoPublicada
      ? resultado.ultimaNota ?? null
      : null,
    mediaCompetencia2: possuiCorrecaoPublicada
      ? arredondarMedia(
          resultado.mediaCompetencia2,
        )
      : null,
    totalEnviadas: resultado.totalEnviadas,
    totalCorrigidas: resultado.totalCorrigidas,
  })
}
