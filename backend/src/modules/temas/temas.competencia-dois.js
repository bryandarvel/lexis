export const MODELO_COMPETENCIA_DOIS = Object.freeze({
  id: 'competencia-2-repertorio-v1',
  versao: 1,
  titulo: 'Competência II — repertório sociocultural',
  descricao:
    'Modelo inicial editável para observar legitimação, pertinência e uso produtivo do repertório. Não substitui as cinco competências do ENEM nem impede critérios personalizados.',
  criterios: Object.freeze([
    Object.freeze({
      nome: 'Legitimação',
      descricao:
        'Verifica se o repertório mobilizado possui fonte reconhecida, referência verificável ou base sociocultural válida.',
    }),
    Object.freeze({
      nome: 'Pertinência',
      descricao:
        'Verifica se o repertório se relaciona diretamente ao tema e ao recorte argumentativo desenvolvido.',
    }),
    Object.freeze({
      nome: 'Uso produtivo',
      descricao:
        'Verifica se o repertório é articulado ao argumento e cumpre função explicativa, comparativa ou comprobatória.',
    }),
  ]),
})

export function obterModeloCompetenciaDois() {
  return {
    ...MODELO_COMPETENCIA_DOIS,
    criterios: MODELO_COMPETENCIA_DOIS.criterios.map(
      (criterio) => ({ ...criterio }),
    ),
  }
}
