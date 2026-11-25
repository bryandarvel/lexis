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

/*
 * Issue #179: "Cancelar marcação" não removia marcação nenhuma — cancelava o
 * ato de marcar, fechando a barra. Agora o trecho já marcado é removido pela
 * própria barra, e fechá-la é clicar fora.
 */
test('o trecho já marcado é removido pela barra, que fecha ao clicar fora', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma da remoção')
  const tema = await novaProposta(cenario, turma, 'Proposta da remoção')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const redacao = await enviarRedacaoPorApi(cenario, aluno, tema.id, 'Repertório fictício para marcar e remover.')

  await entrar(page, cenario.professor)
  await page.goto('/professor/redacoes/' + redacao.id)

  const texto = page.locator('.review-essay-text')
  const barra = page.getByRole('region', { name: 'Marcar este trecho em' })
  const selos = page.getByRole('button', { name: /^Trecho \d+:/ })
  await expect(texto).toBeVisible()

  // Marcar insere o selo antes do fragmento e desloca o texto, então a
  // posição é recalculada a cada clique em vez de guardada.
  const clicarNaPalavra = async () => {
    const palavra = await texto.evaluate((el) => {
      const faixa = document.createRange()
      const no = el.querySelector('[data-inicio="0"]').firstChild
      faixa.setStart(no, 0)
      faixa.setEnd(no, 10)
      const caixa = faixa.getBoundingClientRect()
      return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 }
    })
    await page.mouse.dblclick(palavra.x, palavra.y)
  }

  // Sem marcação, "Remover trecho" já aparece na barra, mas inerte (Issue #190).
  await clicarNaPalavra()
  await expect(barra).toBeVisible()
  await expect(barra.getByRole('button', { name: 'Remover trecho', exact: true })).toBeDisabled()

  // Marca o trecho.
  await barra.getByRole('button', { name: 'Legitimação', exact: true }).click()
  await expect(selos).toHaveCount(1)

  // Selecionar o mesmo trecho oferece a remoção, e não um "Cancelar".
  await clicarNaPalavra()
  await expect(barra).toBeVisible()
  await expect(barra.getByRole('button', { name: /Cancelar/ })).toHaveCount(0)
  await expect(barra.getByRole('button', { name: /^Remover de/ })).toHaveCount(0)
  await barra.getByRole('button', { name: 'Remover trecho', exact: true }).click()
  await expect(selos).toHaveCount(0)
  await expect(barra).toHaveCount(0)

  // Marcado em dois critérios, um clique remove o trecho de todos (Issue #190).
  await clicarNaPalavra()
  await barra.locator('.review-mark-opcao').nth(0).click()
  await clicarNaPalavra()
  await barra.locator('.review-mark-opcao').nth(1).click()
  await expect(selos).toHaveCount(1)
  await clicarNaPalavra()
  await barra.getByRole('button', { name: 'Remover trecho', exact: true }).click()
  await expect(selos).toHaveCount(0)

  // Issue #190: a seleção não precisa ser idêntica à marcação, basta tocá-la.
  await clicarNaPalavra()
  await barra.locator('.review-mark-opcao').nth(0).click()
  await expect(selos).toHaveCount(1)
  const selecionarFaixa = (inicio, fim) => texto.evaluate((el, [i, f]) => {
    const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const ponto = (alvo) => {
      let acumulado = 0
      for (let no = andar.nextNode(); no; no = andar.nextNode()) {
        if (acumulado + no.length >= alvo) return [no, alvo - acumulado]
        acumulado += no.length
      }
      return null
    }
    const [noI, offI] = ponto(i)
    andar.currentNode = el
    const [noF, offF] = ponto(f)
    const faixa = document.createRange()
    faixa.setStart(noI, offI)
    faixa.setEnd(noF, offF)
    document.getSelection().removeAllRanges()
    document.getSelection().addRange(faixa)
  }, [inicio, fim])
  // O tamanho da marcação vem do rótulo do selo (o duplo clique leva o espaço junto).
  const rotulo = await selos.first().getAttribute('aria-label')
  const tamanho = /. (.*)$/s.exec(rotulo)[1].length
  // A faixa 5–(fim+10) sobrepõe a marcação em parte, sem ser idêntica a ela.
  await selecionarFaixa(5, tamanho + 10)
  await expect(barra).toBeVisible()
  await expect(barra.getByRole('button', { name: 'Remover trecho', exact: true })).toBeEnabled()
  // Uma faixa que só encosta no fim da marcação não a toca.
  await selecionarFaixa(tamanho, tamanho + 10)
  await expect(barra.getByRole('button', { name: 'Remover trecho', exact: true })).toBeDisabled()
  // Remover recorta: só a parte selecionada sai, e o que fica fora continua marcado.
  // No meio da marcação (3–6), ela vira dois trechos.
  await selecionarFaixa(3, 6)
  await expect(barra.getByRole('button', { name: 'Remover trecho', exact: true })).toBeEnabled()
  await barra.getByRole('button', { name: 'Remover trecho', exact: true }).click()
  await expect(selos).toHaveCount(2)
  await expect(barra).toHaveCount(0)
  // Numa ponta, sobra uma parte: 5 até depois do fim das duas deixa só [0, 3).
  await selecionarFaixa(5, tamanho + 10)
  await barra.getByRole('button', { name: 'Remover trecho', exact: true }).click()
  await expect(selos).toHaveCount(1)
  // Cobrindo o que resta por inteiro, remove tudo.
  await selecionarFaixa(0, tamanho + 10)
  await barra.getByRole('button', { name: 'Remover trecho', exact: true }).click()
  await expect(selos).toHaveCount(0)
  await expect(barra).toHaveCount(0)

  // Issue #190: durante o arrasto a barra não aparece (ela é sticky e ficava por
  // cima do texto no meio do gesto, fazendo a tela tremer); aparece ao soltar.
  const area = await texto.boundingBox()
  await page.mouse.move(area.x + 10, area.y + 10)
  await page.mouse.down()
  await page.mouse.move(area.x + area.width * 0.6, area.y + 12, { steps: 8 })
  await expect(barra).toHaveCount(0)
  await page.mouse.up()
  await expect(barra).toBeVisible()
  await page.getByRole('heading', { level: 1 }).click()
  await expect(barra).toHaveCount(0)

  // Com o trecho já sem marcação, clicar fora fecha a barra.
  await clicarNaPalavra()
  await expect(barra).toBeVisible()
  await page.getByRole('heading', { level: 1 }).click()
  await expect(barra).toHaveCount(0)
})
