import { validarCriteriosTema } from './topic-form.js'

const nomeNormalizado = (nome) => nome.trim().normalize('NFC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')

export function agruparCriteriosProposta(criterios, modelo) {
  const nomesBase = new Set(modelo.criterios.map((criterio) => nomeNormalizado(criterio.nome)))
  const base = modelo.criterios.map((referencia) => {
    const salvo = criterios.find((criterio) => nomeNormalizado(criterio.nome) === nomeNormalizado(referencia.nome))
    return { ...(salvo ?? referencia), sincronizado: Boolean(salvo) }
  })
  const personalizados = criterios.filter((criterio) => !nomesBase.has(nomeNormalizado(criterio.nome)))
  return { base, personalizados, compativel: base.every((criterio) => criterio.sincronizado) && personalizados.length <= 2 }
}

export function prepararCriterioPersonalizado(criterios, modelo, indice, novo) {
  const grupos = agruparCriteriosProposta(criterios, modelo)
  if (!grupos.compativel) return { erro: 'Esta proposta usa uma configuração anterior. Nenhum critério será alterado automaticamente.' }
  if (indice !== null && (!Number.isInteger(indice) || indice < 0 || indice >= grupos.personalizados.length)) {
    return { erro: 'O critério selecionado não está disponível.' }
  }
  if (indice === null && grupos.personalizados.length >= 2) return { erro: 'Esta proposta já possui dois critérios personalizados.' }
  const criterio = { nome: novo.nome.trim().replace(/\s+/g, ' '), descricao: novo.descricao.trim() }
  if (criterio.nome.length > 120 || criterio.descricao.length > 2000) return { erro: 'Use até 120 caracteres no nome e 2.000 na descrição.' }
  const alvo = indice === null ? null : grupos.personalizados[indice]
  // Preserva ordem e conteúdo dos critérios fixos; nunca migra dados legados silenciosamente.
  const resultado = criterios.map((original) => original === alvo ? criterio : { nome: original.nome, descricao: original.descricao })
  if (indice === null) resultado.push(criterio)
  const erro = validarCriteriosTema(resultado)
  return erro ? { erro } : { criterios: resultado }
}

// Limites iguais aos de atualizarTemaSchema, no backend. Depois da primeira
// entrega (criteriosBloqueados), o backend só aceita o prazo: qualquer campo de
// conteúdo responde 409 ESSAY_TOPIC_CONTENT_LOCKED.
const LIMITES = {
  enunciado: { minimo: 5, maximo: 250 },
  descricao: { minimo: 10, maximo: 10000 },
  instrucoes: { maximo: 5000 },
}

export function formatarPrazoParaInput(valor) {
  const data = new Date(valor)

  if (!valor || Number.isNaN(data.getTime())) {
    return ''
  }

  const parte = (numero) => String(numero).padStart(2, '0')

  return `${data.getFullYear()}-${parte(data.getMonth() + 1)}-${parte(data.getDate())}T${parte(data.getHours())}:${parte(data.getMinutes())}`
}

export function descreverEdicaoTema(tema) {
  if (!tema?.ativo) {
    return {
      podeEditar: false,
      conteudoBloqueado: true,
      motivo: 'Esta proposta está arquivada e não pode mais ser alterada.',
    }
  }

  if (tema.criteriosBloqueados) {
    return {
      podeEditar: true,
      conteudoBloqueado: true,
      motivo: 'Esta proposta já recebeu redações: só o prazo de entrega pode mudar.',
    }
  }

  return { podeEditar: true, conteudoBloqueado: false, motivo: '' }
}

export function prepararEdicaoTema(formulario, tema, agora = Date.now()) {
  const erros = {}
  const enunciado = (formulario.enunciado ?? '').trim().replace(/\s+/g, ' ')
  const descricao = (formulario.descricao ?? '').trim()
  const instrucoes = (formulario.instrucoes ?? '').trim()
  const prazoTexto = formulario.prazoEntrega ?? ''
  // O campo datetime-local só expõe minutos: compara no mesmo nível para que um
  // prazo não editado nunca seja validado nem enviado (o backend só exige prazo
  // futuro quando prazoEntrega está no payload e preserva os segundos originais).
  const prazoAlterado = prazoTexto !== formatarPrazoParaInput(tema.prazoEntrega)
  const prazo = new Date(prazoTexto)
  const { conteudoBloqueado } = descreverEdicaoTema(tema)

  if (enunciado.length < LIMITES.enunciado.minimo || enunciado.length > LIMITES.enunciado.maximo) {
    erros.enunciado = `O enunciado deve possuir entre ${LIMITES.enunciado.minimo} e ${LIMITES.enunciado.maximo} caracteres.`
  }

  if (descricao.length < LIMITES.descricao.minimo || descricao.length > LIMITES.descricao.maximo) {
    erros.descricao = `A descrição deve possuir entre ${LIMITES.descricao.minimo} e ${LIMITES.descricao.maximo} caracteres.`
  }

  if (instrucoes.length > LIMITES.instrucoes.maximo) {
    erros.instrucoes = `As orientações devem possuir no máximo ${LIMITES.instrucoes.maximo} caracteres.`
  }

  if (prazoAlterado) {
    if (Number.isNaN(prazo.getTime())) {
      erros.prazoEntrega = 'Informe uma data e hora válidas.'
    } else if (prazo.getTime() <= agora) {
      erros.prazoEntrega = 'O prazo de entrega deve ser futuro.'
    }
  }

  if (Object.keys(erros).length > 0) {
    return { erros, dados: null }
  }

  const dados = {}

  if (enunciado !== tema.enunciado) dados.enunciado = enunciado
  if (descricao !== tema.descricao) dados.descricao = descricao
  if (instrucoes !== (tema.instrucoes ?? '')) dados.instrucoes = instrucoes.length ? instrucoes : null
  if (prazoAlterado) dados.prazoEntrega = prazo.toISOString()

  if (conteudoBloqueado) {
    for (const campo of ['enunciado', 'descricao', 'instrucoes']) {
      if (campo in dados) {
        erros[campo] = 'Esta proposta já recebeu redações: só o prazo pode mudar.'
      }
    }

    if (Object.keys(erros).length > 0) {
      return { erros, dados: null }
    }
  }

  if (Object.keys(dados).length === 0) {
    return { erros: { formulario: 'Altere pelo menos um campo para salvar.' }, dados: null }
  }

  return { erros: {}, dados }
}

export function obterPublicacaoFeedback(feedback) {
  return (feedback?.historico ?? []).filter((versao) => versao.status === 'PUBLICADA')
    .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0))[0] ?? null
}

export function resumirEntregasProposta(redacoes) {
  const entregues = redacoes.filter((redacao) => ['ENVIADA', 'AVALIADA'].includes(redacao.status))
  return {
    redacoes: entregues,
    alunos: new Set(entregues.map((redacao) => redacao.aluno?.id ?? redacao.alunoId ?? redacao.id)).size,
  }
}
