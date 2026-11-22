import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, novaTurma, novaProposta, matricular, enviarRedacaoPorApi } from '../professor-helpers.js'

const coletarSelos = (locator) => locator.evaluateAll((selos) => selos.map((selo) => ({
  numero: selo.dataset.numero,
  cor: getComputedStyle(selo).borderBottomColor,
})))

test('professor, aluno e A4 preservam números, cores e vínculos de trechos sobrepostos', async ({ page, browser, context, cenario }) => {
  await bloquearRedeExterna(context)
  const turma = await novaTurma(cenario, 'Turma Lote 7 de teste')
  const proposta = await novaProposta(cenario, turma, 'Proposta fictícia do Lote 7')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const paragrafo = '“Café 👩🏽‍🏫” e Constituição ilustram repertório neste exemplo fictício de redação.'
  const texto = Array.from({ length: 42 }, (_, i) => `${i + 1}. ${paragrafo}`).join('\n\n')
  const redacao = await enviarRedacaoPorApi(cenario, aluno, proposta.id, texto)
  const marcar = (inicio, fim) => ({ inicio, fim, trecho: texto.slice(inicio, fim) })
  const compartilhado = marcar(texto.indexOf('“'), texto.indexOf(' ilustram'))
  const parcial = marcar(texto.indexOf('Constituição'), texto.indexOf(' repertório') + ' repertório'.length)
  const inicioTardio = texto.indexOf('28. ') + '28. '.length
  const tardio = marcar(inicioTardio, texto.indexOf('29. ') + '29. '.length + paragrafo.length)
  const diagnostico = 'DIAGNOSTICO_FICTICIO_NAO_PUBLICADO_LOTE7'
  const [legitimacao, pertinencia] = proposta.criterios
  const analise = await cenario.prisma.analiseIA.create({ data: {
    redacaoId: redacao.id, solicitadaPorId: cenario.professor.id, status: 'CONCLUIDA',
    modelo: 'fixture-sem-provedor', versaoPrompt: 'fixture-lote7',
    criteriosSnapshot: proposta.criterios.map(({ id, nome, ordem }) => ({ id, nome, ordem })),
    resultadoEstruturado: { resumoGeral: diagnostico, analisePorCriterio: [{
      ordem: legitimacao.ordem, criterio: legitimacao.nome, diagnostico,
      evidencias: [{ ...compartilhado, statusLocalizacao: 'LOCALIZADA' }],
    }] },
  } })
  const salvo = await cenario.chamada(cenario.professor, 'put', `/api/redacoes/${redacao.id}/feedback`, {
    competencia1: 160, competencia2: 160, competencia3: 160, competencia4: 160, competencia5: 160,
    comentarioGeral: 'Avaliação humana geral do exemplo fictício.',
    criterios: [
      { criterioId: legitimacao.id, comentario: 'Referência contextualizada.', trechos: [{ ...compartilhado, analiseIaId: analise.id }, tardio] },
      { criterioId: pertinencia.id, comentario: 'Relação com o tema da proposta.', trechos: [compartilhado, parcial] },
    ],
  })
  expect(salvo.feedback.criterios[0].trechos[0].analiseIaId).toBe(analise.id)

  await entrar(page, cenario.professor)
  await page.goto(`/professor/redacoes/${redacao.id}`)
  const marcaProfessor = page.getByRole('button', { name: /^Trecho 01: / })
  await page.getByRole('button', { name: 'Marcar com o teclado' }).focus()
  await page.keyboard.press('Tab')
  await expect(marcaProfessor).toBeFocused()
  await expect(marcaProfessor).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  const comentariosProfessor = page.getByRole('navigation', { name: 'Comentários do trecho 01' })
  await expect(comentariosProfessor.getByText('Comentários do trecho 01')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(comentariosProfessor.getByRole('link', { name: legitimacao.nome })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(comentariosProfessor.getByRole('link', { name: pertinencia.nome })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('textbox', { name: 'Comentário: Pertinência' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(marcaProfessor).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Destacar trechos de Legitimação' }).press('Enter')
  await expect(marcaProfessor).toBeFocused()
  await expect(marcaProfessor).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^Trecho 02: / })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: /^Trecho 03: / })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(page.locator('.review-fragment.trecho-em-foco')).toHaveCount(0)
  const selosProfessor = await coletarSelos(page.locator('.review-seal[data-marca]'))
  expect(selosProfessor.map((s) => s.numero)).toEqual(['01', '02', '03'])
  expect(selosProfessor[0].cor).not.toBe(selosProfessor[1].cor)

  await page.getByRole('button', { name: 'Publicar correção', exact: true }).click()
  await page.getByRole('dialog', { name: 'Publicar correção?' }).getByRole('button', { name: 'Publicar correção', exact: true }).click()
  await expect(page.getByText('Correção publicada. O aluno foi notificado no sistema.')).toBeVisible()

  const alunoContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:5180', viewport: { width: 360, height: 800 }, reducedMotion: 'reduce',
  })
  try {
    await bloquearRedeExterna(alunoContext)
    const estudante = await alunoContext.newPage()
    await entrar(estudante, aluno)
    const rotaApi = `/api/aluno/redacoes/${redacao.id}/feedback`
    const resposta = estudante.waitForResponse(r => new URL(r.url()).pathname === rotaApi && r.request().method() === 'GET' && r.ok())
    await estudante.goto(`/aluno/redacoes/${redacao.id}/feedback`)
    const rede = await (await resposta).json()
    expect(JSON.stringify(rede)).not.toMatch(/analiseIaId|snapshot|diagn[oó]stico|resultadoEstruturado|orientacaoAoProfessor/i)
    expect(rede.data.feedback.criterios[0].trechos[0]).toMatchObject({ ...compartilhado, sugeridoPorIa: true })
    for (const criterio of rede.data.feedback.criterios) {
      for (const trecho of criterio.trechos) expect(texto.slice(trecho.inicio, trecho.fim)).toBe(trecho.trecho)
    }

    const marca = estudante.getByRole('button', { name: /^Trecho 01: / })
    await estudante.getByRole('button', { name: 'Destacar trechos de Legitimação' }).press('Enter')
    await expect(marca).toBeFocused()
    await expect(estudante.getByRole('button', { name: /^Trecho 03: / })).toHaveAttribute('aria-pressed', 'true')
    await estudante.keyboard.press('Enter')
    const comentarios = estudante.getByRole('navigation', { name: 'Comentários do trecho 01' })
    await expect(comentarios.getByText('Comentários do trecho 01')).toBeFocused()
    await estudante.keyboard.press('Escape')
    await expect(marca).toBeFocused()
    await expect(comentarios).toHaveCount(0)
    await expect(marca).toHaveAttribute('aria-pressed', 'false')
    await estudante.keyboard.press('Enter')
    await estudante.keyboard.press('Tab')
    await estudante.keyboard.press('Enter')
    const comentario = estudante.getByRole('listitem', { name: legitimacao.nome })
    await expect(comentario).toBeFocused()
    await estudante.keyboard.press('Escape')
    await expect(estudante.locator('.feedback-trecho.trecho-em-foco')).toHaveCount(0)
    expect(await estudante.evaluate(() => document.documentElement.scrollWidth)).toBe(360)

    await estudante.setViewportSize({ width: 1440, height: 900 })
    const selosAluno = estudante.locator('button.feedback-selo-trecho')
    const impressos = estudante.locator('.feedback-selo-trecho.feedback-so-impressao')
    await expect(selosAluno).toHaveCount(3)
    await expect(impressos.first()).toBeHidden()
    expect(await coletarSelos(selosAluno)).toEqual(selosProfessor)
    const textoVisivel = await estudante.locator('.feedback-texto-redacao').evaluate((elemento) => elemento.textContent)
    expect(textoVisivel).toBe(texto)
    await estudante.evaluate(() => { window.print = () => { document.documentElement.dataset.imprimir = 'aberto' } })
    await estudante.getByRole('button', { name: 'Salvar como PDF' }).click()
    await expect(estudante.locator('html')).toHaveAttribute('data-imprimir', 'aberto')

    if (process.env.LEXIS_LOTE7_EVIDENCIAS === '1') {
      const destino = fileURLToPath(new URL('../../output/pdf/lote7/', import.meta.url))
      await mkdir(destino, { recursive: true })
      await estudante.screenshot({ path: destino + 'feedback-claro.png', fullPage: false })
      await estudante.pdf({ path: destino + 'feedback-a4.pdf', preferCSSPageSize: true, printBackground: false })
    }
    await estudante.emulateMedia({ media: 'print' })
    const identidade = estudante.locator('.feedback-folha-identidade')
    await expect(identidade).toContainText('LÉXIS')
    await expect(identidade).toContainText(aluno.nome)
    await expect(identidade).toContainText(turma.nome)
    await expect(estudante.getByRole('button', { name: 'Salvar como PDF' })).toHaveCount(0)
    await expect(selosAluno.first()).toBeHidden()
    await expect(impressos).toHaveCount(3)
    await expect(impressos.first()).toBeVisible()
    expect(await coletarSelos(impressos)).toEqual(selosProfessor)
    await expect(estudante.getByText('Trechos: 01, 03', { exact: true })).toBeVisible()

    await estudante.emulateMedia({ media: 'screen' })
    for (const sessao of [page, estudante]) {
      await sessao.getByRole('button', { name: 'Tema escuro', exact: true }).click()
      await expect(sessao.locator('html')).toHaveAttribute('data-theme', 'dark')
    }
    const selosEscuros = await coletarSelos(page.locator('.review-seal[data-marca]'))
    expect(selosEscuros[0].cor).not.toBe(selosProfessor[0].cor)
    expect(await coletarSelos(selosAluno)).toEqual(selosEscuros)
    if (process.env.LEXIS_LOTE7_EVIDENCIAS === '1') {
      await estudante.setViewportSize({ width: 360, height: 800 })
      await marca.press('Enter')
      await expect(comentarios).toBeVisible()
      const destino = fileURLToPath(new URL('../../output/pdf/lote7/', import.meta.url))
      await estudante.screenshot({ path: destino + 'feedback-escuro-vinculos.png', animations: 'disabled' })
    }
    await estudante.emulateMedia({ media: 'print' })
    expect(await coletarSelos(impressos)).toEqual(selosEscuros)
  } finally {
    await alunoContext.close()
  }
})
