import { test, expect, entrar, texto } from '../fixtures.js'

test.beforeEach(async ({ context }) => {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.hostname === '127.0.0.1' && ['3100', '5180'].includes(url.port)
      ? route.continue()
      : route.abort('blockedbyclient')
  })
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
  await expect(page.getByRole('status').filter({ hasText: 'Salvo no servidor às' })).toBeVisible()
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
  await page.getByRole('tab', { name: 'Enviar foto (OCR)', exact: true }).click()
  await page.getByLabel(/Escolher uma foto da redação/).setInputFiles({
    name: 'fixture-sintetica.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64'),
  })
  await page.getByRole('button', { name: 'Extrair texto da foto', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revise o texto transcrito' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revisar e enviar', exact: true })).toBeDisabled()
  const antes = await cenario.chamada(cenario.aluno, 'get', '/api/aluno/redacoes')
  expect(antes.redacoes.some((r) => r.tema.id === cenario.tema.id)).toBe(false)
  const revisado = 'A Constituição Federal assegura o direito à educação. Texto fictício revisado pelo aluno.'
  await page.getByLabel('Texto da redação', { exact: true }).fill(revisado)
  await page.getByRole('button', { name: 'Confirmar texto revisado', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Revise o texto transcrito' })).toHaveCount(0)
  const dados = await cenario.chamada(cenario.aluno, 'get', '/api/aluno/redacoes')
  const redacao = dados.redacoes.find((r) => r.tema.id === cenario.tema.id)
  expect(redacao.origemTexto).toBe('OCR')
  expect(redacao.ocrRevisadoEm).toBeTruthy()
  expect(redacao.texto).toBe(revisado)
  await enviar(page)
  await expect(page.getByLabel('Texto da redação', { exact: true })).not.toBeEditable()

  const professorContext = await browser.newContext()
  const outroContext = await browser.newContext()
  try {
    const professorPage = await professorContext.newPage()
    await entrar(professorPage, cenario.professor)
    await professorPage.goto('/professor/redacoes/' + redacao.id)
    await professorPage.getByRole('button', { name: 'Analisar com IA', exact: true }).click()
    await expect(professorPage.getByRole('button', { name: 'Analisar novamente com IA', exact: true })).toBeEnabled()
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
    await professorPage.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(professorPage.getByRole('status').filter({ hasText: /salv/i })).toBeVisible()
    const feedbackAntes = await cenario.chamada(cenario.professor, 'get', '/api/redacoes/' + redacao.id + '/feedback')
    expect(feedbackAntes.feedback.versaoAtual.status).toBe('RASCUNHO')
    await page.goto('/aluno/redacoes/' + redacao.id + '/feedback')
    await expect(page.getByRole('heading', { name: 'Correção indisponível' })).toBeVisible()
    professorPage.once('dialog', (d) => d.accept())
    await professorPage.getByRole('button', { name: 'Publicar correção', exact: true }).click()
    await expect(professorPage.getByRole('status').filter({ hasText: 'Correção publicada' })).toBeVisible()
    await page.goto('/aluno/notificacoes')
    await page.getByRole('button', { name: /Ver correção/ }).click()
    await expect(page).toHaveURL(new RegExp('/aluno/redacoes/' + redacao.id + '/feedback$'))
    await expect(page.getByText(comentario, { exact: true })).toBeVisible()
    await expect(page.getByText('800', { exact: true })).toBeVisible()
    const notificacoes = await cenario.prisma.notificacao.findMany({ where: { usuarioId: cenario.aluno.id } })
    expect(notificacoes).toHaveLength(1)
    expect(notificacoes[0].lidaEm).toBeTruthy()
    expect(notificacoes[0].statusEmail).toBe('PENDENTE')

    const outroPage = await outroContext.newPage()
    await entrar(outroPage, cenario.outroAluno)
    await outroPage.goto('/aluno/redacoes/' + redacao.id + '/feedback')
    await expect(outroPage.getByRole('heading', { name: 'Correção indisponível' })).toBeVisible()
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

async function enviar(page) {
  await page.getByRole('button', { name: 'Revisar e enviar', exact: true }).click()
  await page.getByRole('dialog', { name: 'Enviar a redação?' }).getByRole('button', { name: 'Enviar definitivamente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Redação entregue', exact: true })).toBeVisible()
}
