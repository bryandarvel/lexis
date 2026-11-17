import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, novaTurma, novaProposta, matricular, enviarRedacaoPorApi } from '../professor-helpers.js'

test('turmas: uma coluna, progresso em texto e alvos acessíveis nos dois temas', async ({ page, context, cenario }) => {
  await bloquearRedeExterna(context)
  const turma = await novaTurma(cenario, 'Turma com redação corrigida')
  await novaTurma(cenario, 'Outra turma de acabamento')
  const proposta = await novaProposta(cenario, turma, 'Educação e cidadania')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const redacao = await enviarRedacaoPorApi(cenario, aluno, proposta.id)
  await cenario.chamada(cenario.professor, 'put', `/api/redacoes/${redacao.id}/feedback`, {
    competencia1: 160, competencia2: 160, competencia3: 160, competencia4: 160, competencia5: 160,
    comentarioGeral: 'Retorno fictício para validar a contagem.', criterios: [],
  })
  await cenario.chamada(cenario.professor, 'post', `/api/redacoes/${redacao.id}/feedback/publicar`)
  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas')
  const linhas = page.locator('ul.classes-grid > li')
  await expect(linhas).toHaveCount(2)
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  const link = page.getByRole('link', { name: 'Abrir turma ' + turma.nome, exact: true })
  await expect(link).toContainText('1 de 1 corrigidas')
  await expect(link).toContainText('1 aluno')
  await expect(link).toContainText(turma.codigoAcesso)
  await expect(link.getByText('Abrir ›', { exact: true })).toHaveCount(0)
  for (const largura of [320, 768, 1440]) {
    await page.setViewportSize({ width: largura, height: 900 })
    for (const escuro of [false, true]) {
      const botaoTema = page.getByRole('button', { name: 'Tema escuro', exact: true })
      if (await botaoTema.getAttribute('aria-pressed') !== String(escuro)) await botaoTema.click()
      await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(largura)
      const caixas = await linhas.evaluateAll((elementos) => elementos.map(e => {
        const { x, y, width, height } = e.getBoundingClientRect()
        return { x, y, width, height }
      }))
      expect(caixas[0].x).toBe(caixas[1].x)
      expect(caixas[1].y).toBeGreaterThanOrEqual(caixas[0].y + caixas[0].height)
      const filtros = page.getByRole('group', { name: 'Filtrar turmas por situação' }).getByRole('button')
      for (const botao of await filtros.all()) expect((await botao.boundingBox()).height).toBeGreaterThanOrEqual(44)
      if (largura < 1024) {
        const menu = await page.getByRole('button', { name: 'Abrir menu de navegação', exact: true }).boundingBox()
        expect(menu.width).toBeGreaterThanOrEqual(44)
        expect(menu.height).toBeGreaterThanOrEqual(44)
      }
      const numerico = await link.locator('.class-card-progresso').evaluate(e => getComputedStyle(e).fontVariantNumeric)
      expect(numerico).toContain('tabular-nums')
    }
  }
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp('/professor/turmas/' + turma.id))
})

test('páginas públicas: sem animação em repouso e controles de senha com alvo de 44 px', async ({ page, context }) => {
  await bloquearRedeExterna(context)
  for (const rota of ['/login', '/cadastro', '/redefinir-senha']) {
    await page.goto(rota)
    await page.getByRole('heading', { level: 1 }).waitFor()
    for (const largura of [320, 1440]) {
      await page.setViewportSize({ width: largura, height: 900 })
      await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
      const olhos = page.getByRole('button', { name: 'Mostrar senha', exact: true })
      for (const olho of await olhos.all()) {
        const caixa = await olho.boundingBox()
        expect(caixa.height).toBeGreaterThanOrEqual(44)
        expect(caixa.width).toBeGreaterThanOrEqual(44)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(largura)
    }
  }
})
