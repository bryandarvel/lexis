/*
 * Formatador único de datas da interface (Lote 3a, UX-043).
 *
 * Três formas, e só elas:
 *   - 'data'      → 18/10/2026
 *   - 'dataHora'  → 18/10/2026, 23:59
 *   - 'relativa'  → há 5 minutos, há 2 horas, há 3 dias, em 2 dias
 *
 * As opções de Intl ficam todas aqui (UX-032, UX-044): nenhuma tela monta o
 * próprio Intl.DateTimeFormat. A forma relativa cai para 'data' depois de
 * LIMITE_RELATIVA_DIAS dias, para o texto não virar "há 214 dias".
 *
 * Valor ausente ou inválido devolve `vazio` (padrão null), nunca "Invalid Date".
 */

export const LOCALE = 'pt-BR'

export const FORMAS_DATA = Object.freeze({
  data: 'data',
  dataHora: 'dataHora',
  relativa: 'relativa',
})

export const LIMITE_RELATIVA_DIAS = 30

// Opções de Intl em um lugar só. hourCycle fixo evita "11:59 PM" ou "24:00".
export const OPCOES_INTL = Object.freeze({
  data: Object.freeze({ day: '2-digit', month: '2-digit', year: 'numeric' }),
  hora: Object.freeze({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  relativa: Object.freeze({ numeric: 'always' }),
})

const MINUTO_MS = 60 * 1000
const HORA_MS = 60 * MINUTO_MS
const DIA_MS = 24 * HORA_MS

const formatadores = new Map()

function obterFormatador(tipo, fusoHorario) {
  const chave = `${tipo}|${fusoHorario ?? ''}`

  if (!formatadores.has(chave)) {
    const opcoes = fusoHorario
      ? { ...OPCOES_INTL[tipo], timeZone: fusoHorario }
      : OPCOES_INTL[tipo]

    formatadores.set(
      chave,
      tipo === 'relativa'
        ? new Intl.RelativeTimeFormat(LOCALE, opcoes)
        : new Intl.DateTimeFormat(LOCALE, opcoes),
    )
  }

  return formatadores.get(chave)
}

export function converterData(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return null
  }

  const data = valor instanceof Date ? valor : new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data
}

function formatarDia(data, fusoHorario) {
  return obterFormatador('data', fusoHorario).format(data)
}

function formatarDiaHora(data, fusoHorario) {
  return `${formatarDia(data, fusoHorario)}, ${obterFormatador('hora', fusoHorario).format(data)}`
}

function formatarRelativa(data, agora, fusoHorario) {
  const diferenca = data.getTime() - agora.getTime()
  const distancia = Math.abs(diferenca)

  if (distancia >= LIMITE_RELATIVA_DIAS * DIA_MS) {
    return formatarDia(data, fusoHorario)
  }

  if (distancia < MINUTO_MS) {
    return 'agora há pouco'
  }

  const sinal = diferenca < 0 ? -1 : 1
  const formatador = obterFormatador('relativa')

  if (distancia < HORA_MS) {
    return formatador.format(sinal * Math.floor(distancia / MINUTO_MS), 'minute')
  }

  if (distancia < DIA_MS) {
    return formatador.format(sinal * Math.floor(distancia / HORA_MS), 'hour')
  }

  return formatador.format(sinal * Math.floor(distancia / DIA_MS), 'day')
}

export function formatarData(
  valor,
  forma = FORMAS_DATA.data,
  { agora = new Date(), fusoHorario, vazio = null } = {},
) {
  const data = converterData(valor)

  if (!data) {
    return vazio
  }

  switch (forma) {
    case FORMAS_DATA.data:
      return formatarDia(data, fusoHorario)
    case FORMAS_DATA.dataHora:
      return formatarDiaHora(data, fusoHorario)
    case FORMAS_DATA.relativa:
      return formatarRelativa(data, converterData(agora) ?? new Date(), fusoHorario)
    default:
      throw new RangeError(`Forma de data desconhecida: ${String(forma)}`)
  }
}
