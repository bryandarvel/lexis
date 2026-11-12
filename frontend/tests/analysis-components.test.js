import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let servidor, cache, AnalysisPanel, EssayEvidenceText
before(async () => {
  cache = await mkdtemp(join(tmpdir(), 'lexis-analysis-components-'))
  // Cache isolado para não invalidar React no servidor de desenvolvimento aberto.
  servidor = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false,
    cacheDir: cache, plugins: [react()], server: { middlewareMode: true }, appType: 'custom' })
  AnalysisPanel = (await servidor.ssrLoadModule('/src/components/correction/AnalysisPanel.jsx')).default
  EssayEvidenceText = (await servidor.ssrLoadModule('/src/components/correction/EssayEvidenceText.jsx')).default
})
after(async () => {
  await servidor?.close()
  if (cache) await rm(cache, { recursive: true, force: true })
})

test('painel mostra a falha recente e a conclusão anterior datada, sem sucesso antigo', () => {
  const antiga = { id: 'antiga', status: 'CONCLUIDA', concluidaEm: '2026-10-15T22:00:00Z', resultadoEstruturado: { resumoGeral: 'Resultado anterior fictício.' } }
  const html = renderToStaticMarkup(createElement(AnalysisPanel, {
    analysis: { id: 'nova-falhou', status: 'ERRO', mensagemErro: 'GEMINI_SERVICE_UNAVAILABLE: Serviço temporariamente indisponível.' },
    resultAnalysis: antiga, notice: { type: 'success', analiseId: 'antiga', message: 'SUCESSO_ANTIGO_NAO_EXIBIR' },
  }))
  assert.match(html, /Serviço temporariamente indisponível/)
  assert.match(html, /Exibindo a última análise concluída/)
  assert.match(html, /15\/10\/2026/)
  assert.match(html, /Resultado anterior fictício/)
  assert.doesNotMatch(html, /SUCESSO_ANTIGO_NAO_EXIBIR|GEMINI_SERVICE_UNAVAILABLE:/)
})

const falhaPublicada = { id: 'falha-anterior', status: 'ERRO', concluidaEm: '2026-11-12T14:00:00Z', mensagemErro: 'Falha fictícia antes da publicação.' }

test('publicação confirmada rebaixa a falha antiga a histórico consultável, sem reiniciar a espera', () => {
  const html = renderToStaticMarkup(createElement(AnalysisPanel, {
    analysis: falhaPublicada, falhaAnterior: falhaPublicada,
    notice: { type: 'error', analiseId: falhaPublicada.id, message: falhaPublicada.mensagemErro },
    avisoAnterior: { type: 'error', message: falhaPublicada.mensagemErro },
    retryAt: Date.now() + 30000,
  }))
  assert.match(html, /<summary>Falha de IA anterior à publicação<\/summary>/)
  assert.match(html, /12\/11\/2026/)
  assert.equal(html.match(/Falha fictícia antes da publicação\./g).length, 1)
  assert.doesNotMatch(html, /role="alert"|Consultar resultado existente|Nenhuma análise solicitada/)
  assert.match(html, /<button[^>]*disabled[^>]*>Analisar novamente com IA/)
})

test('falha nova é ativa mesmo quando sua mensagem coincide com a do histórico', () => {
  const html = renderToStaticMarkup(createElement(AnalysisPanel, {
    analysis: falhaPublicada, falhaAnterior: falhaPublicada,
    notice: { type: 'error', message: falhaPublicada.mensagemErro },
  }))
  assert.match(html, /role="alert"/)
  assert.match(html, /Consultar resultado existente/)
  assert.match(html, /<summary>Falha de IA anterior à publicação<\/summary>/)
})

test('falha persistida depois da publicação mantém alerta e não remove a falha anterior', () => {
  const html = renderToStaticMarkup(createElement(AnalysisPanel, {
    analysis: { ...falhaPublicada, id: 'nova', mensagemErro: 'Falha fictícia nova.' },
    falhaAnterior: falhaPublicada,
  }))
  assert.match(html, /role="alert"[^>]*>Falha fictícia nova\./)
  assert.match(html, /Falha fictícia antes da publicação\./)
})

test('aviso de transporte sem análise persistida fica consultável depois da publicação', () => {
  const html = renderToStaticMarkup(createElement(AnalysisPanel, {
    avisoAnterior: { type: 'error', ocorridaEm: Date.parse('2026-11-12T14:00:00Z'), message: 'Falha transitória anterior.' },
  }))
  assert.match(html, /<summary>Falha de IA anterior à publicação<\/summary>/)
  assert.match(html, /Falha transitória anterior\./)
  assert.doesNotMatch(html, /role="alert"/)
})

test('trecho comum aos três critérios conserva vínculos e exibe as três cores', () => {
  const texto = 'Direito à educação.'
  const criterios = ['Legitimação', 'Pertinência', 'Uso produtivo'].map((nome, i) => ({ nome, ordem: i + 1 }))
  const analise = { status: 'CONCLUIDA', resultadoEstruturado: { analisePorCriterio: criterios.map(c => ({
    criterio: c.nome, ordem: c.ordem, evidencias: [{ trecho: texto, inicio: 0, fim: texto.length, statusLocalizacao: 'LOCALIZADA' }],
  })) } }
  const html = renderToStaticMarkup(createElement(EssayEvidenceText, { texto, analise, criterios }))
  for (const i of [0, 1, 2]) assert.match(html, new RegExp(`linear-gradient\\(var\\(--review-color-${i}\\)`))
  assert.match(html, /Comentários: Legitimação, Pertinência, Uso produtivo/)
  for (const c of criterios) assert.ok(html.includes(`${c.nome}: 1 trecho marcado`))
  assert.match(html, /Os números identificam trechos, não critérios/)
  assert.match(html, /Um mesmo trecho pode apoiar mais de um critério/)
  const divergente = renderToStaticMarkup(createElement(EssayEvidenceText, { texto: 'Outro texto.', analise, criterios }))
  assert.doesNotMatch(divergente, /class="review-mark/)
  assert.ok(divergente.includes('Uso produtivo: 0 trechos marcados'))
})

test('legenda distingue evidências de critérios e não esconde referências do desenvolvimento', () => {
  const referencias = ['Bauman.', 'Constituição.', 'Hannah Arendt.', 'Marco Civil.', 'Black Mirror.']
  const texto = referencias.join('\n\n')
  const criterios = ['Legitimação', 'Pertinência', 'Uso produtivo'].map((nome, i) => ({ nome, ordem: i + 1 }))
  const evidencias = referencias.map(trecho => ({ trecho, inicio: texto.indexOf(trecho), fim: texto.indexOf(trecho) + trecho.length, statusLocalizacao: 'LOCALIZADA' }))
  const analise = { status: 'CONCLUIDA', resultadoEstruturado: { analisePorCriterio: criterios.map(c => ({
    criterio: c.nome, ordem: c.ordem, evidencias: c.ordem === 3 ? [] : evidencias,
  })) } }
  const html = renderToStaticMarkup(createElement(EssayEvidenceText, { texto, analise, criterios }))
  assert.ok(html.includes('Legitimação: 5 trechos marcados'))
  assert.ok(html.includes('Pertinência: 5 trechos marcados'))
  assert.ok(html.includes('Uso produtivo: 0 trechos marcados'))
  assert.equal((html.match(/class="review-mark /g) ?? []).length, 5)
  for (const referencia of referencias) assert.ok(html.includes(referencia))
})
