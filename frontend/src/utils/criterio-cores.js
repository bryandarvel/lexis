/*
 * Cor de cada critério de repertório (#44).
 *
 * Uma regra só para a correção do professor e o feedback do aluno: a cor vem
 * da ordem do critério, nunca do nome nem da posição na lista renderizada.
 * Assim um critério tem a mesma cor nas duas telas, inclusive em propostas
 * legadas — base ausente, critério fixo fora das posições 1 a 3 ou mais de
 * dois personalizados. Sem ordem válida, o tom é neutro e estável.
 *
 * As classes correspondentes são .feedback-tom-* (aluno) e .review-tone-*
 * (professor), com a mesma paleta de cinco cores nos dois temas.
 */
export const TOTAL_TONS_CRITERIO = 5
export const TOM_NEUTRO = 'neutro'

export function obterTomCriterio(criterioOuOrdem) {
  const ordem =
    typeof criterioOuOrdem === 'object' && criterioOuOrdem !== null
      ? criterioOuOrdem.ordem
      : criterioOuOrdem

  if (!Number.isInteger(ordem) || ordem < 1) {
    return TOM_NEUTRO
  }

  return String((ordem - 1) % TOTAL_TONS_CRITERIO)
}
