import assert from 'node:assert/strict'
import test from 'node:test'
import { avisoEstadoAnalise, avisoAtualDaAnalise, mensagemErroAnalise, TIMEOUT_ANALISE_IA_MS, TIMEOUT_OCR_MS, obterEsperaMinimaAnalise, obterFalhaAnteriorPublicacao, segundosRestantesAnalise, avisoAnaliseDuplicado } from '../src/utils/external-request.js'

test('só arquiva falhas finalizadas até uma publicação confirmada', () => {
  const publicadoEm = '2026-11-12T12:00:00Z'
  const recente = { id: 'nova', status: 'ERRO', solicitadaEm: '2026-11-12T11:59:00Z', concluidaEm: '2026-11-12T12:01:00Z' }
  const antiga = { id: 'antiga', status: 'ERRO', concluidaEm: '2026-11-12T11:58:00Z' }
  assert.equal(obterFalhaAnteriorPublicacao([recente, antiga]), null)
  assert.equal(obterFalhaAnteriorPublicacao([recente, antiga], 'inválido'), null)
  assert.equal(obterFalhaAnteriorPublicacao([recente, antiga], publicadoEm), antiga)
  assert.equal(obterFalhaAnteriorPublicacao([recente, antiga], publicadoEm, '2026-11-12T12:02:00Z'), recente)
  assert.equal(obterFalhaAnteriorPublicacao([{ status: 'ERRO' }, { ...antiga, status: 'CONCLUIDA' }], publicadoEm), null)
})

test('falha legada sem data de conclusão usa a data da solicitação', () => {
  const falha = { status: 'ERRO', solicitadaEm: '2026-11-12T12:00:00Z' }
  assert.equal(obterFalhaAnteriorPublicacao([falha], '2026-11-12T12:01:00Z'), falha)
})

test('chamadas externas têm margem sobre os limites máximos do servidor', () => {
  assert.equal(TIMEOUT_ANALISE_IA_MS, 200000)
  assert.equal(TIMEOUT_OCR_MS, 140000)
  assert.ok(TIMEOUT_ANALISE_IA_MS > 180000)
  assert.ok(TIMEOUT_OCR_MS > 120000)
})

test('consulta de análise não declara sucesso para erro ou processamento', () => {
  assert.equal(avisoEstadoAnalise({ status: 'CONCLUIDA' }).type, 'info')
  assert.equal(avisoEstadoAnalise({ status: 'CONCLUIDA' }, { nova: true }).type, 'success')
  assert.equal(avisoEstadoAnalise({ status: 'ERRO' }).type, 'error')
  assert.equal(avisoEstadoAnalise({ status: 'PROCESSANDO' }).type, 'info')
  assert.equal(avisoEstadoAnalise(null).type, 'info')
})

test('somente a conclusão da tentativa solicitada pode anunciar uma nova análise', () => {
  const concluida = { id: 'nova', status: 'CONCLUIDA' }
  const aviso = avisoEstadoAnalise(concluida, { nova: true })
  assert.equal(avisoAtualDaAnalise(concluida, aviso), aviso)
  assert.equal(avisoAtualDaAnalise({ id: 'erro-posterior', status: 'ERRO' }, aviso), null)
  assert.equal(avisoAtualDaAnalise({ id: 'outra-conclusao', status: 'CONCLUIDA' }, aviso), null)
  assert.equal(avisoAtualDaAnalise({ id: 'nova', status: 'PROCESSANDO' }, aviso), null)
  assert.match(avisoEstadoAnalise(concluida).message, /não solicitou uma nova análise/)
  assert.equal(avisoAtualDaAnalise(concluida, { type: 'error', message: 'Consulta falhou.' }).type, 'error')
})

test('o erro apresentado ao professor tem mensagem legível e preserva o diagnóstico no registro', () => {
  const analise = { status: 'ERRO', mensagemErro: 'GEMINI_SERVICE_UNAVAILABLE: Serviço temporariamente indisponível.' }
  assert.equal(mensagemErroAnalise(analise), 'Serviço temporariamente indisponível.')
  assert.match(analise.mensagemErro, /^GEMINI_SERVICE_UNAVAILABLE:/)
  assert.ok(mensagemErroAnalise({ status: 'ERRO' }))
})

test('obtém a espera mínima somente de erros Gemini com prazo inteiro seguro', () => {
  const criar = (segundos, code = 'GEMINI_COOLDOWN') => ({ response: { data: { error: { code, details: { retryAfterSeconds: segundos } } } } })
  assert.equal(obterEsperaMinimaAnalise(criar(120), 1000), 121000)
  for (const valor of [null, undefined, -1, 0, 1.5, '60', Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.equal(obterEsperaMinimaAnalise(criar(valor), 1000), 0)
  }
  assert.equal(obterEsperaMinimaAnalise(criar(60, 'OTHER_ERROR'), 1000), 0)
  assert.equal(obterEsperaMinimaAnalise(new Error('Sem resposta'), 1000), 0)
})

test('o limite local por professor também impede nova solicitação até o prazo indicado', () => {
  const erro = { response: { status: 429, data: { error: { code: 'AI_ANALYSIS_RATE_LIMIT_EXCEEDED', details: { retryAfterSeconds: 850 } } } } }
  assert.equal(obterEsperaMinimaAnalise(erro, 1000), 851000)
})

test('mensagem histórica não reinicia nem reapresenta o prazo relativo de uma falha antiga', () => {
  const mensagem = 'O Google recusou a análise por limite de uso, sem identificar qual cota foi atingida. Aguarde pelo menos 86373 segundos antes de tentar novamente; esse prazo não garante a liberação da cota.'
  const analise = { status: 'ERRO', mensagemErro: `GEMINI_SERVICE_LIMIT_REACHED: ${mensagem}` }
  assert.doesNotMatch(mensagemErroAnalise(analise), /86373|Aguarde pelo menos/)
  assert.match(mensagemErroAnalise(analise), /Google recusou/)
  assert.equal(avisoAnaliseDuplicado(analise, { type: 'error', message: mensagem }), true)
})

test('espera expira sem reiniciar nem declarar liberação da cota', () => {
  assert.equal(segundosRestantesAnalise(61000, 1000), 60)
  assert.equal(segundosRestantesAnalise(61000, 60999), 1)
  assert.equal(segundosRestantesAnalise(61000, 61000), 0)
  assert.equal(segundosRestantesAnalise(61000, 70000), 0)
  assert.equal(segundosRestantesAnalise(undefined, 1000), 0)
})

test('não duplica o mesmo erro recebido e persistido, mas conserva avisos diferentes', () => {
  const analise = { status: 'ERRO', mensagemErro: 'GEMINI_RATE_LIMITED: Mensagem segura.' }
  assert.equal(avisoAnaliseDuplicado(analise, { type: 'error', message: 'Mensagem segura.' }), true)
  assert.equal(avisoAnaliseDuplicado({ ...analise, mensagemErro: 'Mensagem segura.' }, { type: 'error', message: 'Mensagem segura.' }), true)
  assert.equal(avisoAnaliseDuplicado(analise, { type: 'error', message: 'Falha ao consultar o histórico.' }), false)
  assert.equal(avisoAnaliseDuplicado(analise, { type: 'success', message: 'Mensagem segura.' }), false)
  assert.equal(avisoAnaliseDuplicado({ status: 'ERRO' }, { type: 'error' }), false)
})
