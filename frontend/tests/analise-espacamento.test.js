import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/*
 * Issue #190. Durante a análise, o aviso "Análise em andamento" vinha logo
 * depois do botão "Analisando…" e ficava colado nele: só o botão tinha margem.
 */
const css = readFileSync(new URL('../src/pages/professor/professor-correction.css', import.meta.url), 'utf8')
const painel = readFileSync(new URL('../src/components/correction/AnalysisPanel.jsx', import.meta.url), 'utf8')

test('o aviso que segue o botão de análise tem respiro acima', () => {
  assert.match(css, /\.review-analysis-acao \+ \.review-notice\s*\{\s*margin-top:\s*12px;?\s*\}/)
})

test('o botão continua imediatamente antes do aviso de andamento', () => {
  // Se algo for inserido entre os dois, o seletor irmão adjacente deixa de valer.
  assert.match(painel, /\{!result && acao\}\s*\{espera > 0 && <p className="review-notice">/)
})
