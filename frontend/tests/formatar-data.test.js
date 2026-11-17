import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FORMAS_DATA,
  LIMITE_RELATIVA_DIAS,
  converterData,
  descreverTempoDesde,
  formatarData,
} from '../src/utils/formatar-data.js'
import { formatarNumero } from '../src/utils/formatar-numero.js'

const UTC = { fusoHorario: 'UTC' }
const AGORA = new Date('2026-10-18T12:00:00Z')

test('indicador diferencia uma gravação recente, de hoje e de outro dia', () => {
  const opcoes = { ...UTC, agora: AGORA }
  assert.equal(descreverTempoDesde('2026-10-18T11:59:31Z', opcoes), 'agora')
  assert.equal(descreverTempoDesde('2026-10-18T11:58:00Z', opcoes), 'hoje às 11:58')
  assert.equal(descreverTempoDesde('2026-10-17T11:58:00Z', opcoes), 'em 17/10/2026 às 11:58')
  assert.equal(descreverTempoDesde('inválida', opcoes), null)
})

test('forma data: dia, mês e ano com dois dígitos', () => {
  assert.equal(formatarData('2026-10-18T23:59:00Z', 'data', UTC), '18/10/2026')
  assert.equal(formatarData('2026-01-05T03:00:00Z', 'data', UTC), '05/01/2026')
})

test('forma padrão é data', () => {
  assert.equal(formatarData('2026-10-18T23:59:00Z', undefined, UTC), '18/10/2026')
})

test('forma dataHora: usa 24 horas e nunca "24:00"', () => {
  assert.equal(formatarData('2026-10-18T23:59:00Z', 'dataHora', UTC), '18/10/2026, 23:59')
  assert.equal(formatarData('2026-10-18T00:05:00Z', 'dataHora', UTC), '18/10/2026, 00:05')
})

test('respeita o fuso horário informado', () => {
  assert.equal(
    formatarData('2026-10-19T02:30:00Z', 'dataHora', { fusoHorario: 'America/Sao_Paulo' }),
    '18/10/2026, 23:30',
  )
})

test('aceita Date, texto ISO e número', () => {
  const instante = Date.UTC(2026, 9, 18, 8, 7)

  assert.equal(formatarData(new Date(instante), 'dataHora', UTC), '18/10/2026, 08:07')
  assert.equal(formatarData(instante, 'dataHora', UTC), '18/10/2026, 08:07')
  assert.equal(formatarData(new Date(instante).toISOString(), 'dataHora', UTC), '18/10/2026, 08:07')
})

test('valor ausente ou inválido devolve o valor de vazio, nunca "Invalid Date"', () => {
  for (const valor of [null, undefined, '', 'não é data', new Date('x'), NaN]) {
    for (const forma of Object.values(FORMAS_DATA)) {
      assert.equal(formatarData(valor, forma, UTC), null)
    }
  }

  assert.equal(formatarData(null, 'data', { vazio: 'Não informada' }), 'Não informada')
})

test('forma relativa: menos de um minuto', () => {
  assert.equal(formatarData('2026-10-18T11:59:30Z', 'relativa', { agora: AGORA }), 'agora há pouco')
  assert.equal(formatarData('2026-10-18T12:00:30Z', 'relativa', { agora: AGORA }), 'agora há pouco')
})

test('forma relativa: minutos, horas e dias no passado', () => {
  const relativa = (iso) => formatarData(iso, 'relativa', { agora: AGORA })

  assert.equal(relativa('2026-10-18T11:55:00Z'), 'há 5 minutos')
  assert.equal(relativa('2026-10-18T11:00:00Z'), 'há 1 hora')
  assert.equal(relativa('2026-10-18T09:00:00Z'), 'há 3 horas')
  assert.equal(relativa('2026-10-15T12:00:00Z'), 'há 3 dias')
})

test('forma relativa: prazos futuros', () => {
  const relativa = (iso) => formatarData(iso, 'relativa', { agora: AGORA })

  assert.equal(relativa('2026-10-18T14:00:00Z'), 'em 2 horas')
  assert.equal(relativa('2026-10-20T12:00:00Z'), 'em 2 dias')
})

test('forma relativa: passado o limite, cai para a data', () => {
  const limite = LIMITE_RELATIVA_DIAS * 24 * 60 * 60 * 1000
  const justoAntes = new Date(AGORA.getTime() - limite + 60 * 1000)
  const noLimite = new Date(AGORA.getTime() - limite)

  assert.match(formatarData(justoAntes, 'relativa', { agora: AGORA, ...UTC }), /^há 29 dias$/)
  assert.equal(formatarData(noLimite, 'relativa', { agora: AGORA, ...UTC }), '18/09/2026')
})

test('forma desconhecida é erro de programação, não texto na tela', () => {
  assert.throws(() => formatarData(AGORA, 'curta'), RangeError)
})

test('converterData rejeita o que não é data', () => {
  assert.equal(converterData('lixo'), null)
  assert.ok(converterData('2026-10-18T12:00:00Z') instanceof Date)
})

test('formatarNumero usa o padrão pt-BR e respeita as casas', () => {
  assert.equal(formatarNumero(1234567), '1.234.567')
  assert.equal(formatarNumero(7.25, { casas: 1 }), '7,3')
  assert.equal(formatarNumero(920), '920')
  assert.equal(formatarNumero(null), null)
  assert.equal(formatarNumero('abc', { vazio: '—' }), '—')
})
