import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, enviarRedacaoPorApi, matricular, novaProposta, novaTurma } from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

test('correção separa sugestão do comentário humano e protege a navegação da fila', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma da fila de correção')
  const tema = await novaProposta(cenario, turma, 'Proposta da fila')
  const primeiro = await cenario.criarConta('ALUNO')
  const segundo = await cenario.criarConta('ALUNO')
  await matricular(cenario, primeiro, turma)
  await matricular(cenario, segundo, turma)
  const inicial = await enviarRedacaoPorApi(cenario, primeiro, tema.id)
  const seguinte = await enviarRedacaoPorApi(cenario, segundo, tema.id)
  await page.route('**/api/redacoes/' + inicial.id + '/analises-ia', (route) => route.fulfill({
    json: { data: { analises: [{
      id: 'resultado-ficticio', status: 'CONCLUIDA', resultadoEstruturado: {
        analisePorCriterio: [{ ordem: 1, criterio: 'Legitimação', diagnostico: 'Sugestão fictícia para revisão.' }],
      },
    }] } },
  }))
  await page.setViewportSize({ width: 360, height: 900 })
  await entrar(page, cenario.professor)
  await page.goto('/professor/redacoes/' + inicial.id)
  const comentario = page.getByRole('textbox', { name: 'Comentário: Legitimação' })
  await expect(comentario).toHaveValue('')
  await expect(page.getByText('Sugestão da IA, não publicada')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Marcações no texto' })).toBeVisible()
  await expect(page.getByRole('tabpanel')).toHaveCount(0)
  await page.getByRole('button', { name: 'Usar como ponto de partida' }).click()
  await expect(comentario).toHaveValue('Sugestão fictícia para revisão.')
  await expect(comentario).toBeFocused()

  const proxima = page.getByRole('button', { name: 'Próxima redação' })
  await proxima.click()
  const confirmacao = page.getByRole('dialog', { name: 'Ir para outra redação?' })
  await expect(confirmacao.getByRole('button', { name: 'Voltar à correção' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(proxima).toBeFocused()
  await proxima.click()
  await confirmacao.getByRole('button', { name: 'Ir para a redação' }).click()
  await expect(page).toHaveURL(new RegExp('/professor/redacoes/' + seguinte.id + '$'))
  await expect(page.getByRole('list', { name: 'Marcações no texto' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Redação anterior' }).click()
  await expect(page).toHaveURL(new RegExp('/professor/redacoes/' + inicial.id + '$'))
  await expect(page.getByText('Rascunho local encontrado')).toBeVisible()
  await page.getByRole('button', { name: 'Recuperar rascunho' }).click()
  await expect(comentario).toHaveValue('Sugestão fictícia para revisão.')

  for (const nota of await page.getByRole('spinbutton', { name: /Nota da Competência/ }).all()) {
    await nota.fill('160')
  }
  await page.getByRole('textbox', { name: 'Comentário geral' }).fill('Avaliação humana para o cenário fictício.')
  await page.getByRole('button', { name: 'Publicar correção', exact: true }).click()
  const publicar = page.getByRole('dialog', { name: 'Publicar correção?' })
  await expect(publicar).toContainText('Fixture B34 ALUNO · Versão 1 (prévia) · Nota 800')
  await expect(publicar).toContainText('Critérios com comentário: 1 de 3.')
  await expect(publicar).toContainText('O aluno será notificado no sistema.')
  await expect(publicar.getByRole('button', { name: 'Voltar à correção' })).toBeFocused()
  await publicar.getByRole('button', { name: 'Publicar correção', exact: true }).click()
  await expect(page.getByText('Correção publicada. O aluno foi notificado no sistema.')).toBeVisible()

  const novaVersao = page.getByRole('button', { name: 'Publicar nova versão', exact: true })
  await expect(novaVersao).toBeDisabled()
  await page.getByRole('textbox', { name: 'Comentário geral' }).fill('Avaliação humana atualizada para a próxima versão.')
  await novaVersao.click()
  const republicar = page.getByRole('dialog', { name: 'Publicar nova versão?' })
  await expect(republicar).toContainText('Versão 2 (prévia)')
  await expect(republicar).toContainText('O aluno receberá um novo aviso no sistema.')
  await page.keyboard.press('Escape')
  await expect(novaVersao).toBeFocused()
})

test('nova proposta distingue título, comando e critérios sem sair da turma', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma da nova proposta')
  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await page.getByRole('link', { name: 'Nova proposta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Nova proposta de redação', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Título da proposta')).toBeEditable()
  await expect(page.getByLabel('Comando da redação')).toBeEditable()
  await expect(page.getByRole('heading', { name: 'Legitimação · fixo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Criar proposta', exact: true })).toBeVisible()
})
