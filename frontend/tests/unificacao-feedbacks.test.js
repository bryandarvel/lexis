import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

/*
 * Issue #180. A página Feedbacks deixou de existir: a lista das correções
 * publicadas vive em Minhas redações, que já mostrava a mesma nota e o mesmo
 * link. Estes testes guardam o que dá para guardar sem renderizar a rota.
 */
const ler = (caminho) =>
  readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8')

test('a página e o CSS da lista de feedbacks foram removidos', () => {
  for (const arquivo of ['pages/aluno/AlunoFeedbacksPage.jsx', 'pages/aluno/aluno-feedbacks.css']) {
    assert.equal(existsSync(new URL(`../src/${arquivo}`, import.meta.url)), false, arquivo)
  }
})

test('o endereço antigo redireciona para Minhas redações, sem deixar histórico', () => {
  const rotas = ler('routes/AppRoutes.jsx')

  assert.doesNotMatch(rotas, /AlunoFeedbacksPage/)
  assert.match(
    rotas,
    /path="\/aluno\/feedbacks"[\s\S]*?<Navigate\s+to="\/aluno\/redacoes"\s+replace/,
  )
})

test('Minhas redações traz o que a página Feedbacks mostrava', () => {
  const pagina = ler('pages/aluno/AlunoRedacoesPage.jsx')

  // Média das notas publicadas no resumo, e professor/data em cada item.
  assert.match(pagina, /Média das notas publicadas/)
  assert.match(pagina, /descreverAutoriaDoFeedback\(redacao\)/)
  // Filtro de situação e ordenação já existiam e continuam.
  assert.match(pagina, /FILTROS_SITUACAO/)
  assert.match(pagina, /ORDENACOES/)
})

test('o botão de PDF diz o que faz: abre a impressão e salva como PDF', () => {
  // Sem comentários: o do próprio componente cita o rótulo antigo de propósito.
  const pagina = ler('pages/aluno/AlunoFeedbackPage.jsx').replace(/\/\*[\s\S]*?\*\//g, '')

  assert.match(pagina, /Salvar como PDF/)
  assert.doesNotMatch(pagina, /Baixar em PDF/)
  // A explicação é visível para todos, e não só para leitor de tela.
  assert.match(pagina, /Abre a impressão do navegador\./)
  assert.doesNotMatch(pagina, /className="sr-only"\s*>\s*Abre a impressão/)
  // Continua escondido na própria impressão.
  assert.match(pagina, /print:hidden/)
})
