let proximoIdCriterio = 0

function criarIdCriterio() {
  proximoIdCriterio += 1

  return `criterio-local-${proximoIdCriterio}`
}

export function criarCriterioVazio() {
  return {
    idLocal: criarIdCriterio(),
    nome: '',
    descricao: '',
  }
}

export function criarCriteriosDoModelo(modelo) {
  return (modelo?.criterios ?? []).map(
    (criterio) => ({
      idLocal: criarIdCriterio(),
      nome: criterio.nome,
      descricao: criterio.descricao,
    }),
  )
}

export function moverCriterio(
  criterios,
  indiceOrigem,
  deslocamento,
) {
  const indiceDestino = indiceOrigem + deslocamento

  if (
    indiceOrigem < 0 ||
    indiceOrigem >= criterios.length ||
    indiceDestino < 0 ||
    indiceDestino >= criterios.length
  ) {
    return criterios
  }

  const copia = [...criterios]
  const [movido] = copia.splice(indiceOrigem, 1)
  copia.splice(indiceDestino, 0, movido)

  return copia
}

export function prepararTemaParaEnvio(formulario) {
  const prazo = new Date(formulario.prazoEntrega)

  return {
    enunciado: formulario.enunciado,
    descricao: formulario.descricao,
    instrucoes: formulario.instrucoes,
    prazoEntrega: prazo.toISOString(),
    criterios: formulario.criterios.map(
      ({ nome, descricao }) => ({
        nome,
        descricao,
      }),
    ),
  }
}

export function validarCriteriosTema(criterios) {
  if (criterios.length === 0) {
    return 'Informe pelo menos um critério.'
  }

  const criterioIncompleto = criterios.some(
    (criterio) =>
      criterio.nome.trim().length < 2 ||
      criterio.descricao.trim().length < 5,
  )

  if (criterioIncompleto) {
    return 'Preencha o nome e a descrição de todos os critérios.'
  }

  const nomes = criterios.map((criterio) =>
    criterio.nome.trim().toLocaleLowerCase('pt-BR'),
  )

  if (new Set(nomes).size !== nomes.length) {
    return 'Os critérios não podem possuir nomes repetidos.'
  }

  return null
}

export function validarFormularioTema(formulario) {
  if (formulario.enunciado.trim().length < 5) {
    return 'O enunciado deve possuir pelo menos 5 caracteres.'
  }

  if (formulario.descricao.trim().length < 10) {
    return 'A descrição deve possuir pelo menos 10 caracteres.'
  }

  const prazo = new Date(formulario.prazoEntrega)

  if (
    Number.isNaN(prazo.getTime()) ||
    prazo.getTime() <= Date.now()
  ) {
    return 'Informe um prazo futuro válido.'
  }

  return validarCriteriosTema(formulario.criterios)
}
