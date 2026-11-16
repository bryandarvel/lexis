import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, novaTurma } from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

// Retorno de foco do diálogo "Propostas por turma" aberto pelo menu da casca (Issue #150).
// Na gaveta (abaixo de 1024 px) o botão clicado fica oculto antes de o diálogo fechar, então
// o foco volta ao botão que abre a gaveta; no menu fixo, volta ao próprio botão "Propostas".

test('celular: Propostas pela gaveta, Esc devolve o foco ao botão da gaveta', async ({ page, cenario }) => {
  await novaTurma(cenario, 'Turma do foco mobile')
  await page.setViewportSize({ width: 390, height: 800 })
  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas')
  await expect(page.getByRole('heading', { level: 1, name: 'Turmas' })).toBeVisible()

  const abrirGaveta = page.getByRole('button', { name: 'Abrir menu de navegação', exact: true })
  await abrirGaveta.click()
  const propostas = page.getByRole('navigation', { name: 'Navegação do professor' }).getByRole('button', { name: 'Propostas', exact: true })
  await expect(propostas).toBeEnabled()
  await propostas.focus()
  await page.keyboard.press('Enter')

  const dialogo = page.getByRole('dialog', { name: 'Propostas por turma' })
  await expect(dialogo).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)

  // A gaveta fechou ao ativar a ação; o foco volta ao botão que a abre.
  await expect(page.getByRole('button', { name: 'Abrir menu de navegação', exact: true })).toBeFocused()
})

test('desktop: Propostas direto no menu, Esc devolve o foco ao próprio botão', async ({ page, cenario }) => {
  await novaTurma(cenario, 'Turma do foco desktop')
  await page.setViewportSize({ width: 1440, height: 900 })
  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas')
  await expect(page.getByRole('heading', { level: 1, name: 'Turmas' })).toBeVisible()

  const propostas = page.getByRole('navigation', { name: 'Navegação do professor' }).getByRole('button', { name: 'Propostas', exact: true })
  await expect(propostas).toBeEnabled()
  await propostas.focus()
  await page.keyboard.press('Enter')

  const dialogo = page.getByRole('dialog', { name: 'Propostas por turma' })
  await expect(dialogo).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)
  await expect(propostas).toBeFocused()
})
