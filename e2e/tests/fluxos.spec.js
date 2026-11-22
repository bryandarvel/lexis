import { test, expect, entrar, texto } from '../fixtures.js'

// Só o servidor local de teste (API 3100 e Vite 5180) é acessível. Cada contexto do navegador é
// isolado e não herda o bloqueio de outro: todo contexto criado aqui precisa passar por esta função
// antes de abrir qualquer página.
async function bloquearRedeExterna(context) {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.hostname === '127.0.0.1' && ['3100', '5180'].includes(url.port)
      ? route.continue()
      : route.abort('blockedbyclient')
  })
}

test.beforeEach(async ({ context }) => {
  await bloquearRedeExterna(context)
})

test('sessão real restaura após reload, respeita papel e é encerrada no logout', async ({ page, context, cenario }) => {
  await entrar(page, cenario.aluno)
  const cookie = (await context.cookies()).find((c) => c.httpOnly)
  expect(cookie).toBeTruthy()
  const renovacao = page.waitForResponse((r) => r.url().endsWith('/api/auth/refresh') && r.request().method() === 'POST')
  await page.reload()
  expect((await renovacao).status()).toBe(200)
  await expect(page.getByRole('button', { name: /Menu do usuário/ })).toBeVisible()
  await page.goto('/professor/turmas')
  await expect(page).toHaveURL(/\/aluno$/)
  await page.getByRole('button', { name: /Menu do usuário/ }).click()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect((await context.cookies()).some((c) => c.httpOnly)).toBe(false)
  await page.goto('/aluno')
  await expect(page).toHaveURL(/\/login$/)
})

test('propostas abertas e vencidas aparecem; rascunho digitado persiste e envio tardio é imutável', async ({ page, cenario }) => {
  await entrar(page, cenario.aluno)
  const lista = page.getByRole('region', { name: 'Propostas da turma' })
  await expect(lista.getByRole('heading', { name: cenario.adicional.enunciado })).toBeVisible()
  const item = lista.getByRole('listitem').filter({ has: page.getByRole('heading', { name: cenario.vencida.enunciado }) })
  await expect(item).toContainText('Prazo vencido')
  await item.getByRole('link', { name: /Escrever redação/ }).click()
  await page.getByLabel('Texto da redação', { exact: true }).fill(texto)
  await page.getByRole('button', { name: 'Salvar agora', exact: true }).click()
  await expect(page.locator('#status-salvamento')).toHaveText(/^Salvo (agora|hoje às|em )/)
  await page.reload()
  await expect(page.getByLabel('Texto da redação', { exact: true })).toHaveValue(texto)
  const dados = await cenario.chamada(cenario.aluno, 'get', '/api/aluno/redacoes')
  const redacao = dados.redacoes.find((r) => r.tema.id === cenario.vencida.id)
  expect(redacao.texto).toBe(texto)
  await enviar(page)
  const salva = await cenario.prisma.redacao.findUnique({ where: { id: redacao.id } })
  expect(salva.status).toBe('ENVIADA')
  expect(salva.enviadaEm > new Date(Date.now() - 86400000)).toBe(true)
  await cenario.chamada(cenario.aluno, 'put', '/api/aluno/temas/' + cenario.vencida.id + '/redacao', { texto: 'Tentativa fictícia de alteração indevida.' }, 409)
  expect((await cenario.prisma.redacao.findUnique({ where: { id: redacao.id } })).texto).toBe(texto)
  await expect(page.getByLabel('Texto da redação', { exact: true })).not.toBeEditable()
  await page.reload()
  await expect(page.getByLabel('Texto da redação', { exact: true })).not.toBeEditable()
})

test('OCR exige revisão; professor publica feedback humano e só o aluno responsável acessa', async ({ page, browser, cenario }) => {
  await entrar(page, cenario.aluno)
  await page.goto('/aluno/temas/' + cenario.tema.id + '/redacao')
  await page.getByRole('tab', { name: 'Enviar foto', exact: true }).click()
  await page.getByLabel(/Escolher uma foto da redação/).setInputFiles({
    name: 'fixture-sintetica.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64'),
  })
  await page.getByRole('button', { name: 'Extrair texto da foto', exact: true }).click()
  // A tela de revisão (etapa 3 de 4) exibe a foto e a transcrição editável; o envio só existe no editor.
  await expect(page.getByRole('heading', { name: 'Revise a transcrição', level: 1 })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Você revisa' })).toContainText('etapa atual')
  await expect(page.getByRole('img', { name: 'Foto da redação enviada para transcrição' })).toBeVisible()
  const transcricao = page.getByRole('textbox', { name: 'Texto extraído — editável', exact: true })
  await expect(transcricao).toBeEditable()
  await expect(transcricao).toHaveValue(/Transcrição fictícia para revisão\./)
  await expect(page.getByRole('button', { name: 'Revisar e enviar', exact: true })).toHaveCount(0)
  // Nada é salvo até o aluno aceitar a transcrição.
  const antes = await cenario.chamada(cenario.aluno, 'get', '/api/aluno/redacoes')
  expect(antes.redacoes.some((r) => r.tema.id === cenario.tema.id)).toBe(false)
  const revisado = 'A Constituição Federal assegura o direito à educação. Texto fictício revisado pelo aluno.'
  await transcricao.fill(revisado)
  await page.getByRole('button', { name: 'Aceitar e continuar', exact: true }).click()
  // Aceitar salva como rascunho e leva o texto revisado ao editor.
  await expect(page.getByRole('heading', { name: 'Revise a transcrição' })).toHaveCount(0)
  await expect(page).toHaveURL(new RegExp('/aluno/temas/' + cenario.tema.id + '/redacao$'))
  await expect(page.getByText('Transcrição revisada e salva como rascunho.')).toBeVisible()
  await expect(page.getByLabel('Texto da redação', { exact: true })).toHaveValue(revisado)
  const dados = await cenario.chamada(cenario.aluno, 'get', '/api/aluno/redacoes')
  const redacao = dados.redacoes.find((r) => r.tema.id === cenario.tema.id)
  expect(redacao.status).toBe('RASCUNHO')
  expect(redacao.origemTexto).toBe('OCR')
  expect(redacao.ocrRevisadoEm).toBeTruthy()
  expect(redacao.texto).toBe(revisado)
  await enviar(page)
  await expect(page.getByLabel('Texto da redação', { exact: true })).not.toBeEditable()

  const professorContext = await browser.newContext()
  const outroContext = await browser.newContext()
  try {
    await bloquearRedeExterna(professorContext)
    await bloquearRedeExterna(outroContext)
    const professorPage = await professorContext.newPage()
    await entrar(professorPage, cenario.professor)
    await professorPage.goto('/professor/redacoes/' + redacao.id)
    // Issue #179: com resultado na tela, a ação vira "Gerar nova análise".
    await professorPage.getByRole('button', { name: 'Analisar redação com IA', exact: true }).click()
    await expect(professorPage.getByRole('button', { name: 'Gerar nova análise', exact: true })).toBeEnabled()
    // Por texto: o papel de <summary> varia entre navegadores e não é o que
    // esta asserção quer fixar — e sim que a faixa das sugestões apareceu.
    await expect(professorPage.getByText('Mostrar sugestões da IA', { exact: true })).toBeVisible()
    expect(await cenario.prisma.feedback.count({ where: { redacaoId: redacao.id } })).toBe(0)
    expect(await cenario.prisma.analiseIA.count({ where: { redacaoId: redacao.id, status: 'CONCLUIDA' } })).toBe(1)
    for (const numero of ['I', 'II', 'III', 'IV', 'V']) {
      await expect(professorPage.getByLabel('Nota da Competência ' + numero, { exact: true })).toHaveValue('')
      await professorPage.getByLabel('Nota da Competência ' + numero, { exact: true }).fill('160')
    }
    const comentario = 'Feedback humano fictício, revisado e publicado explicitamente.'
    await professorPage.getByRole('textbox', { name: 'Comentário geral', exact: true }).fill(comentario)
    for (const criterio of cenario.tema.criterios) {
      await professorPage.getByRole('textbox', { name: 'Comentário: ' + criterio.nome, exact: true }).fill('Comentário humano de ' + criterio.nome + '.')
    }
    const sugestao = professorPage.getByRole('button', { name: 'Aprovar trecho: A Constituição Federal', exact: true })
    await sugestao.click()
    await expect(professorPage.getByRole('button', { name: /^Trecho 01: Legitimação/ })).toBeVisible()
    await professorPage.getByRole('button', { name: /^Descartar sugestão: A Constituição Federal assegura/ }).click()
    await professorPage.getByRole('button', { name: 'Salvar', exact: true }).click()
    // O aviso do servidor é distinto do aviso de rascunho local ("salvas neste dispositivo"), que também casaria com /salv/.
    await expect(professorPage.getByText('Rascunho salvo. O aluno ainda não pode visualizar estas alterações.')).toBeVisible()
    const feedbackAntes = await cenario.chamada(cenario.professor, 'get', '/api/redacoes/' + redacao.id + '/feedback')
    expect(feedbackAntes.feedback.versaoAtual.status).toBe('RASCUNHO')
    expect(feedbackAntes.feedback.versaoAtual.criterios[0].trechos).toEqual([
      expect.objectContaining({ inicio: 0, trecho: 'A Constituição Federal', sugeridoPorIa: true }),
    ])
    await page.goto('/aluno/redacoes/' + redacao.id + '/feedback')
    // Redação enviada, mas com feedback ainda em rascunho: o aluno só vê que a correção não foi publicada.
    await expect(page.getByRole('heading', { name: 'A correção ainda não foi publicada' })).toBeVisible()
    await expect(page.getByText(comentario, { exact: true })).toHaveCount(0)
    await publicar(professorPage)
    await expect(professorPage.getByRole('status').filter({ hasText: 'Correção publicada' })).toBeVisible()
    await expect(professorPage.getByRole('button', { name: 'Publicar nova versão', exact: true })).toBeDisabled()
    await page.goto('/aluno/notificacoes')
    await page.getByRole('button', { name: /Ver correção/ }).click()
    await expect(page).toHaveURL(new RegExp('/aluno/redacoes/' + redacao.id + '/feedback$'))
    await expect(page.getByText(comentario, { exact: true })).toBeVisible()
    await expect(page.getByText('800', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Trecho 01', exact: true })).toBeVisible()
    await expect(page.getByText(/sugerido pela IA|Sugestões da IA/)).toHaveCount(0)
    const notificacoes = await cenario.prisma.notificacao.findMany({ where: { usuarioId: cenario.aluno.id } })
    expect(notificacoes).toHaveLength(1)
    expect(notificacoes[0].lidaEm).toBeTruthy()
    expect(notificacoes[0].statusEmail).toBe('PENDENTE')

    const outroPage = await outroContext.newPage()
    await entrar(outroPage, cenario.outroAluno)
    await outroPage.goto('/aluno/redacoes/' + redacao.id + '/feedback')
    // Redação de outra conta: a tela responde "não encontrada", sem revelar que ela existe.
    await expect(outroPage.getByRole('heading', { name: 'Redação não encontrada' })).toBeVisible()
    await expect(outroPage.getByText(comentario, { exact: true })).toHaveCount(0)
    const negado = await cenario.chamada(cenario.outroAluno, 'get', '/api/aluno/notificacoes')
    expect(negado.notificacoes).toHaveLength(0)
    const acesso = await outroContext.request.get('http://127.0.0.1:3100/api/redacoes/' + redacao.id + '/feedback', {
      headers: { Authorization: 'Bearer ' + cenario.outroProfessor.token },
    })
    expect(acesso.status()).toBe(404)
  } finally {
    await professorContext.close()
    await outroContext.close()
  }
})

test('trechos manuais sem IA: teclado, cancelamento, falha de gravação, retorno e publicação', async ({ page, cenario }) => {
  const textoLongo = ('“Café 👩🏽‍🏫”. Uma redação fictícia para verificar trechos e navegação.\n\n').repeat(28).trimEnd()
  const { redacao } = await cenario.chamada(cenario.aluno, 'put', '/api/aluno/temas/' + cenario.tema.id + '/redacao', { texto: textoLongo })
  await cenario.chamada(cenario.aluno, 'post', '/api/aluno/temas/' + cenario.tema.id + '/redacao/enviar')
  await entrar(page, cenario.professor)
  const rota = '/professor/redacoes/' + redacao.id
  await page.goto(rota)
  const teclado = page.getByRole('button', { name: 'Marcar com o teclado', exact: true })
  const textoDaRedacao = page.locator('.review-essay-text')
  const barra = page.getByRole('region', { name: 'Marcar este trecho em' })
  await expect(textoDaRedacao).toHaveText(textoLongo)
  const inicioDaLinha = await textoDaRedacao.evaluate((el) => {
    const faixa = document.createRange()
    const no = el.querySelector('[data-inicio="0"]').firstChild
    faixa.setStart(no, 1)
    faixa.setEnd(no, 6)
    const caixa = faixa.getBoundingClientRect()
    return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 }
  })
  await page.mouse.dblclick(inicioDaLinha.x, inicioDaLinha.y)
  await expect(barra).toBeVisible()
  // Issue #179: "Cancelar marcação" saiu; clicar fora da barra é o que fecha.
  await expect(barra.getByRole('button', { name: /Cancelar/ })).toHaveCount(0)
  await page.getByRole('heading', { level: 1 }).click()
  await expect(barra).toHaveCount(0)
  await teclado.click()
  await expect(textoDaRedacao).toBeFocused()
  await page.keyboard.press('Shift+ArrowRight')
  await page.keyboard.press('Enter')
  await expect(barra).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(barra).toHaveCount(0)
  await expect(teclado).toBeFocused()
  await teclado.click()
  for (let i = 0; i < 7; i++) await page.keyboard.press('Shift+ArrowRight')
  await page.keyboard.press('Enter')
  await barra.getByRole('button', { name: 'Legitimação', exact: true }).click()
  const marca = page.getByRole('button', { name: /^Trecho 01: Legitimação/ })
  await marca.click()
  const cartao = page.getByRole('region', { name: 'Trechos de Legitimação' })
  const ajustar = cartao.getByRole('button', { name: /^Ajustar bordas/ })
  await ajustar.click()
  await cartao.getByRole('button', { name: 'Avançar fim', exact: true }).click()
  await cartao.getByRole('button', { name: 'Cancelar ajuste', exact: true }).click()
  await expect(ajustar).toBeFocused()
  await ajustar.click()
  await cartao.getByRole('button', { name: 'Avançar fim', exact: true }).click()
  await cartao.getByRole('button', { name: 'Confirmar ajuste', exact: true }).click()
  const esperado = '“Café 👩🏽‍🏫”'
  await expect(cartao).toContainText(esperado)
  expect(await textoDaRedacao.evaluate((el) => {
    const faixa = document.createRange()
    faixa.selectNodeContents(el)
    return faixa.toString()
  })).toBe(textoLongo)

  const salvar = page.getByRole('button', { name: 'Salvar', exact: true })
  await salvar.click()
  await expect(page.getByRole('alert')).toContainText('Escreva um comentário para os critérios com trechos marcados')
  const comentario = page.getByRole('textbox', { name: 'Comentário: Legitimação', exact: true })
  await comentario.fill('Referência fictícia analisada pelo professor.')
  await page.route('**/api/redacoes/' + redacao.id + '/feedback', (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    return route.fulfill({ status: 422, json: { error: { message: 'Falha de teste ao salvar o trecho.' } } })
  })
  await salvar.click()
  await expect(page.getByRole('alert')).toContainText('Falha de teste ao salvar o trecho.')
  await expect(cartao).toContainText(esperado)
  await expect(comentario).toHaveValue('Referência fictícia analisada pelo professor.')
  await page.unroute('**/api/redacoes/' + redacao.id + '/feedback')
  await salvar.click()
  await expect(page.getByText(/Rascunho salvo\. O aluno ainda/)).toBeVisible()
  await page.getByRole('link', { name: 'LÉXIS', exact: true }).click()
  await expect(page).toHaveURL(/\/professor$/)
  await page.goBack()
  await expect(cartao).toContainText(esperado)
  await cartao.getByRole('button', { name: /^Remover trecho/ }).click()
  await expect(cartao.getByText('Nenhum trecho marcado.')).toBeVisible()
  await salvar.click()
  await expect(page.getByText(/Rascunho salvo\. O aluno ainda/)).toBeVisible()
  const salvo = await cenario.chamada(cenario.professor, 'get', '/api/redacoes/' + redacao.id + '/feedback')
  expect(salvo.feedback.versaoAtual.criterios[0].trechos).toEqual([])

  // Simula a seleção nativa em viewport móvel; não substitui o toque real.
  await page.setViewportSize({ width: 360, height: 768 })
  const emulacao = await page.context().newCDPSession(page)
  await emulacao.send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await textoDaRedacao.evaluate((el) => {
    const no = el.querySelector('[data-inicio="0"]').firstChild
    const faixa = document.createRange()
    faixa.setStart(no, 0); faixa.setEnd(no, 16)
    const selecao = document.getSelection()
    selecao.removeAllRanges(); selecao.addRange(faixa)
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))
  })
  await barra.getByRole('button', { name: 'Legitimação', exact: true }).click()
  await emulacao.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await emulacao.detach()
  for (const numero of ['I', 'II', 'III', 'IV', 'V']) {
    await page.getByLabel('Nota da Competência ' + numero, { exact: true }).fill('160')
  }
  await page.getByRole('textbox', { name: 'Comentário geral', exact: true }).fill('Feedback humano fictício do fluxo sem IA.')
  await publicar(page)
  await expect(page.getByRole('status').filter({ hasText: 'Correção publicada' })).toBeVisible()
  const feedback = (await cenario.chamada(cenario.aluno, 'get', '/api/aluno/redacoes/' + redacao.id + '/feedback')).feedback
  expect(feedback.criterios[0].trechos).toEqual([expect.objectContaining({ trecho: textoLongo.slice(0, 16), sugeridoPorIa: false })])

  for (const tema of ['claro', 'escuro']) {
    // O alternador tem nome fixo ("Tema escuro"); o estado vai em aria-pressed.
    const alternar = page.getByRole('button', { name: 'Tema escuro', exact: true })
    const queroEscuro = tema === 'escuro'
    if ((await alternar.getAttribute('aria-pressed')) !== String(queroEscuro)) await alternar.click()
    await expect(alternar).toHaveAttribute('aria-pressed', String(queroEscuro))
    for (const largura of [320, 360, 768, 1024, 1366, 1440]) {
      await page.setViewportSize({ width: largura, height: 768 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth), tema + ' a ' + largura + ' px').toBeLessThanOrEqual(largura)
      if (largura >= 1024) {
        for (const botao of [salvar, page.getByRole('button', { name: 'Publicar nova versão', exact: true })]) {
          const caixa = await botao.boundingBox()
          expect(caixa.y).toBeGreaterThanOrEqual(0)
          expect(caixa.y + caixa.height).toBeLessThanOrEqual(768)
        }
      } else {
        await expect(page.getByRole('navigation', { name: 'Seções da correção' })).toBeVisible()
      }
    }
  }
  await cartao.getByRole('button', { name: /^Remover trecho/ }).click()
  await page.getByRole('button', { name: 'Publicar nova versão', exact: true }).click()
  const confirmacao = page.getByRole('dialog', { name: 'Publicar nova versão?' })
  await expect(confirmacao).toContainText('Versão 2 (prévia)')
  await confirmacao.getByRole('button', { name: 'Publicar nova versão', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Correção publicada' })).toBeVisible()
  const historico = (await cenario.chamada(cenario.professor, 'get', '/api/redacoes/' + redacao.id + '/feedback')).feedback.historico
  expect(historico.map((v) => [v.numero, v.status, v.criterios[0].trechos.length])).toEqual([[2, 'PUBLICADA', 0], [1, 'SUBSTITUIDA', 1]])
  const atual = (await cenario.chamada(cenario.aluno, 'get', '/api/aluno/redacoes/' + redacao.id + '/feedback')).feedback
  expect(atual.criterios[0].trechos).toEqual([])
})

async function publicar(page) {
  await page.getByRole('button', { name: 'Publicar correção', exact: true }).click()
  await page.getByRole('dialog', { name: 'Publicar correção?' }).getByRole('button', { name: 'Publicar correção', exact: true }).click()
}

async function enviar(page) {
  await page.getByRole('button', { name: 'Revisar e enviar', exact: true }).click()
  await page.getByRole('dialog', { name: 'Enviar a redação?' }).getByRole('button', { name: 'Enviar definitivamente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Redação entregue', exact: true })).toBeVisible()
}
