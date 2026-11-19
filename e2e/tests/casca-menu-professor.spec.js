import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, novaProposta, novaTurma } from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

/*
 * Menu do professor depois da Issue #173: só Painel, Turmas e Perfil, todos
 * links. Substitui casca-foco.spec.js (Issue #150), que cobria o retorno de
 * foco do diálogo "Propostas por turma" — item e diálogo foram removidos.
 *
 * O que este spec guarda é o motivo da remoção: "Propostas" dependia das
 * turmas carregadas pela tela e nascia desabilitado em toda página que não as
 * carrega, entre elas Notificações, que é para onde o sino leva. Era o relato
 * de "o sino impede o clique em Propostas". Sem ações no menu, não há item que
 * possa aparecer sem destino.
 */

const ITENS = ['Painel', 'Turmas', 'Perfil']

async function conferirMenu(page, atual) {
  const menu = page.getByRole('navigation', { name: 'Navegação do professor' })

  await expect(menu.getByRole('link')).toHaveText(ITENS)
  // Nenhuma ação: todo item leva a algum lugar e nenhum pode vir desabilitado.
  await expect(menu.getByRole('button')).toHaveCount(0)

  for (const rotulo of ITENS) {
    const item = menu.getByRole('link', { name: rotulo, exact: true })

    await expect(item).toBeEnabled()
    if (rotulo === atual) await expect(item).toHaveAttribute('aria-current', 'page')
    else await expect(item).not.toHaveAttribute('aria-current', 'page')
  }
}

test('o menu do professor tem três destinos e nenhum item morto', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma do menu')
  const tema = await novaProposta(cenario, turma, 'Proposta fictícia para conferir o menu')

  await entrar(page, cenario.professor)

  await page.goto('/professor')
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
  await conferirMenu(page, 'Painel')

  await page.goto('/professor/turmas')
  await expect(page.getByRole('heading', { level: 1, name: 'Turmas' })).toBeVisible()
  await conferirMenu(page, 'Turmas')

  // A proposta vive dentro de uma turma: é "Turmas" que fica marcado.
  await page.goto(`/professor/temas/${tema.id}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await conferirMenu(page, 'Turmas')

  await page.goto('/professor/perfil')
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
  await conferirMenu(page, 'Perfil')
})

test('do sino até Notificações, nenhum item do menu fica sem destino', async ({ page, cenario }) => {
  await novaTurma(cenario, 'Turma do sino')
  await entrar(page, cenario.professor)
  await page.goto('/professor')
  await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()

  await page.getByRole('button', { name: /^Notificações:/ }).click()

  const painel = page.getByRole('dialog', { name: 'Notificações' })
  await expect(painel).toBeVisible()
  await painel.getByRole('link', { name: 'Ver todas' }).click()

  await expect(page).toHaveURL(/\/professor\/notificacoes$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Notificações' })).toBeVisible()

  // A página não é destino do menu: nenhum item marcado, e nenhum morto.
  await conferirMenu(page, null)
})
