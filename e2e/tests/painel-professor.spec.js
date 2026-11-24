import { test, expect, entrar } from '../fixtures-professor.js'
import {
  bloquearRedeExterna, enviarRedacaoPorApi, matricular, novaProposta, novaTurma,
} from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

/*
 * Issue #194: "Situação por turma" já tinha os números reais de cada turma, e
 * agora é dali que sai o recorte da fila "Para corrigir". O filtro é da lista
 * que o painel já carregou: nenhuma chamada nova, e a ordem das mais antigas
 * continua valendo dentro da turma escolhida.
 */
test('o painel filtra a fila pela turma, sem nova chamada, e volta a todas', async ({ page, cenario }) => {
  const daFila = await novaTurma(cenario, 'Turma que espera correção')
  const outra = await novaTurma(cenario, 'Turma da outra ponta')
  const temaDaFila = await novaProposta(cenario, daFila, 'Proposta da turma que espera')
  const temaDaOutra = await novaProposta(cenario, outra, 'Proposta da outra ponta')
  const primeiro = await cenario.criarConta('ALUNO')
  const segundo = await cenario.criarConta('ALUNO')
  await matricular(cenario, primeiro, daFila)
  await matricular(cenario, segundo, outra)
  await enviarRedacaoPorApi(cenario, primeiro, temaDaFila.id, 'Redação fictícia da turma que espera.')
  await enviarRedacaoPorApi(cenario, segundo, temaDaOutra.id, 'Redação fictícia da outra ponta.')

  await entrar(page, cenario.professor)
  await page.goto('/professor')

  const fila = page.getByRole('region', { name: /^Para corrigir/ })
  const pendentes = fila.getByRole('listitem')
  const cartaoDaTurma = page.getByRole('region', { name: 'Situação por turma' })
    .getByRole('listitem').filter({ hasText: 'Turma que espera correção' })
  const filtrar = cartaoDaTurma.getByRole('button', { name: /^Filtrar a fila/ })

  await expect(page.getByRole('heading', { name: /^Para corrigir \(\d+\)$/ })).toBeVisible()
  const prioridade = page.getByRole('region', { name: 'Correção mais antiga' })
  const acaoPrioritaria = prioridade.getByRole('link', { name: 'Corrigir', exact: true })
  const destinoPrioritario = await pendentes.first().getByRole('link').getAttribute('href')
  await expect(acaoPrioritaria).toHaveAttribute('href', destinoPrioritario)
  await expect(page.getByRole('region', { name: 'Prazos dos próximos 7 dias' })
    .getByText('Turma que espera correção · 1 de 1 entregaram')).toBeVisible()
  const total = await pendentes.count()
  expect(total).toBeGreaterThan(1)
  await expect(filtrar).toHaveAttribute('aria-pressed', 'false')

  // Enquanto o filtro age, a página não pode ir buscar nada no servidor.
  const chamadas = []
  page.on('request', (requisicao) => {
    if (requisicao.url().includes('/api/')) chamadas.push(requisicao.url())
  })

  await filtrar.click()
  await expect(page.getByRole('heading', { name: 'Para corrigir (1) · Turma que espera correção' })).toBeVisible()
  await expect(pendentes).toHaveCount(1)
  await expect(pendentes.first()).toContainText('Turma que espera correção')
  await expect(filtrar).toHaveAttribute('aria-pressed', 'true')
  await expect(acaoPrioritaria).toHaveAttribute('href', destinoPrioritario)
  expect(chamadas).toEqual([])

  // O foco vai para a fila: ela fica acima de onde se clicou.
  await expect(page.getByRole('heading', { name: /^Para corrigir \(1\)/ })).toBeFocused()

  await fila.getByRole('button', { name: 'Ver todas as turmas', exact: true }).click()
  await expect(page.getByRole('heading', { name: `Para corrigir (${total})` })).toBeVisible()
  await expect(pendentes).toHaveCount(total)
  await expect(filtrar).toHaveAttribute('aria-pressed', 'false')
  expect(chamadas).toEqual([])
})

/*
 * Issue #194: uma turma sem nada aguardando não oferece um filtro que levaria
 * a uma fila vazia — o botão existe, desabilitado, e diz por quê.
 */
test('turma sem fila não oferece o filtro', async ({ page, cenario }) => {
  const vazia = await novaTurma(cenario, 'Turma sem nada na fila')
  await novaProposta(cenario, vazia, 'Proposta sem entregas')

  await entrar(page, cenario.professor)
  await page.goto('/professor')

  const cartao = page.getByRole('region', { name: 'Situação por turma' })
    .getByRole('listitem').filter({ hasText: 'Turma sem nada na fila' })

  await expect(cartao.getByRole('button', { name: /^Filtrar a fila/ })).toBeDisabled()
  const prazos = page.getByRole('region', { name: 'Prazos dos próximos 7 dias' })
  await expect(prazos.getByRole('link', { name: 'Proposta sem entregas' })).toBeVisible()
  await expect(prazos.getByText('Turma sem nada na fila · 0 de 0 entregaram')).toBeVisible()
})
