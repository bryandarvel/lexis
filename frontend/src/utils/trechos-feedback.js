/*
 * Trechos marcados no feedback (#42).
 *
 * O contrato do PUT /api/redacoes/:id/feedback é estrito: cada item de
 * criterios aceita trechos[{inicio, fim, trecho, analiseIaId?}], e o servidor
 * exige texto.slice(inicio, fim) === trecho, sem aparar nem normalizar. Por
 * isso nada aqui mexe no texto selecionado.
 *
 * Omitir a chave trechos preserva o que já estava salvo; enviar [] limpa.
 * Nunca enviamos id, sugeridoPorIa ou diagnóstico: a origem é derivada no
 * servidor, e o cliente não opina sobre ela.
 */
export const LIMITE_TRECHOS_POR_CRITERIO = 20

// Mesmo teto do backend (feedbacks.schemas.js): offsets e texto até 20000.
const LIMITE_OFFSET = 20000

function ehInteiro(valor) {
  return Number.isInteger(valor)
}

// Um par surrogate ocupa duas unidades UTF-16; cortar no meio produziria um
// texto que o servidor recusaria ao comparar com a redação.
function cortaCaractereAoMeio(texto, inicio, fim) {
  const metadeAlta = (codigo) => codigo >= 0xd800 && codigo <= 0xdbff
  const metadeBaixa = (codigo) => codigo >= 0xdc00 && codigo <= 0xdfff

  return (
    (inicio > 0 && metadeAlta(texto.charCodeAt(inicio - 1)) && metadeBaixa(texto.charCodeAt(inicio))) ||
    (fim < texto.length && metadeAlta(texto.charCodeAt(fim - 1)) && metadeBaixa(texto.charCodeAt(fim)))
  )
}

export function criarTrechoDaSelecao(texto, inicio, fim) {
  const recusar = (erro) => ({ trecho: null, erro })

  if (typeof texto !== 'string' || texto === '') {
    return recusar('O texto da redação não está disponível.')
  }

  if (!ehInteiro(inicio) || !ehInteiro(fim)) {
    return recusar('A seleção não pôde ser interpretada.')
  }

  if (inicio < 0 || fim > texto.length || fim > LIMITE_OFFSET) {
    return recusar('A seleção está fora do texto da redação.')
  }

  if (fim <= inicio) {
    return recusar('Selecione pelo menos um caractere.')
  }

  if (cortaCaractereAoMeio(texto, inicio, fim)) {
    return recusar('A seleção corta um caractere ao meio. Ajuste as bordas.')
  }

  return { trecho: { inicio, fim, trecho: texto.slice(inicio, fim) }, erro: '' }
}

// Devolve a mensagem do impedimento, ou string vazia quando pode acrescentar.
export function podeAcrescentarTrecho(existentes, novo) {
  const lista = Array.isArray(existentes) ? existentes : []

  if (lista.length >= LIMITE_TRECHOS_POR_CRITERIO) {
    return `Cada critério aceita no máximo ${LIMITE_TRECHOS_POR_CRITERIO} trechos.`
  }

  const repetido = lista.some(
    (item) => item?.inicio === novo?.inicio && item?.fim === novo?.fim,
  )

  return repetido ? 'Este mesmo trecho já está marcado neste critério.' : ''
}

export function montarTrechosParaEnvio(trechos) {
  return (Array.isArray(trechos) ? trechos : []).map((item) => ({
    inicio: item.inicio,
    fim: item.fim,
    trecho: item.trecho,
    ...(item.analiseIaId ? { analiseIaId: item.analiseIaId } : {}),
  }))
}

// alterado distingue "o professor não mexeu" (omite, preserva o salvo) de
// "o professor limpou" (envia [], remove as marcações do rascunho).
export function montarCriterioParaEnvio({
  criterioId,
  comentario,
  trechos,
  alterado = false,
}) {
  const item = { criterioId, comentario: String(comentario ?? '').trim() }

  if (!alterado) {
    return item
  }

  return { ...item, trechos: montarTrechosParaEnvio(trechos) }
}

// Os trechos vêm do servidor, mas o texto pode ter mudado entre versões: o
// que não coincidir é descartado, em vez de marcar o lugar errado.
export function validarTrechosRecebidos(texto, trechos) {
  if (typeof texto !== 'string' || texto === '') {
    return []
  }

  return (Array.isArray(trechos) ? trechos : [])
    .filter(
      (item) =>
        item &&
        ehInteiro(item.inicio) &&
        ehInteiro(item.fim) &&
        item.inicio >= 0 &&
        item.fim > item.inicio &&
        item.fim <= texto.length &&
        texto.slice(item.inicio, item.fim) === item.trecho,
    )
    .sort((a, b) => a.inicio - b.inicio || a.fim - b.fim)
}
