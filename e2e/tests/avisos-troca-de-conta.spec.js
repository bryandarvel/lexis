import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna } from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

// Lote 5 (§9B, critério 6) e pendência do PR #157: na troca de conta A → B pela
// reautenticação, a resposta de A que chega atrasada não pode aparecer nem na
// lista do painel de avisos nem no emblema do sino.

const EVENTO_SESSAO_EXPIRADA = 'lexis:sessao-expirada'

async function criarAviso(cenario, pessoa, titulo) {
  await cenario.prisma.notificacao.create({
    data: {
      usuarioId: pessoa.id,
      tipo: 'MATRICULA_ENCERRADA',
      titulo,
      mensagem: 'Aviso fictício da fixture, sem conteúdo real.',
      statusEmail: null,
    },
  })
}

async function trocarDeContaPelaReautenticacao(page, pessoa) {
  await page.evaluate((nome) => globalThis.dispatchEvent(new CustomEvent(nome)), EVENTO_SESSAO_EXPIRADA)
  const dialogo = page.getByRole('dialog', { name: 'Sua sessão expirou' })
  await expect(dialogo).toBeVisible()
  await dialogo.getByLabel('E-mail', { exact: true }).fill(pessoa.email)
  await dialogo.getByLabel('Senha', { exact: true }).fill(pessoa.senha)
  await dialogo.getByRole('button', { name: 'Entrar e continuar', exact: true }).click()
  await expect(dialogo).toHaveCount(0)
}

// Segura a resposta da lista de A: a requisição vai ao servidor na hora (com o
// token de A) e a resposta só é entregue ao navegador quando `liberar()` roda.
async function segurarListaDeAvisos(page) {
  const controle = { segurar: false, pedidos: 0, entregues: 0, liberar: () => {} }
  const liberada = new Promise((resolver) => { controle.liberar = resolver })

  await page.route('**/api/aluno/notificacoes', async (rota) => {
    if (rota.request().method() !== 'GET' || !controle.segurar) return rota.continue()

    controle.pedidos += 1
    const resposta = await rota.fetch()
    await liberada
    await rota.fulfill({ response: resposta }).then(() => { controle.entregues += 1 }).catch(() => {})
  })

  return controle
}

async function preparar(page, cenario, { semCancelamento = false } = {}) {
  // Duas contas de aluno só para este cenário; a fixture as apaga no fim.
  const contaA = await cenario.criarConta('ALUNO')
  const contaB = await cenario.criarConta('ALUNO')

  await criarAviso(cenario, contaA, 'Aviso exclusivo da conta A 1')
  await criarAviso(cenario, contaA, 'Aviso exclusivo da conta A 2')
  await criarAviso(cenario, contaB, 'Aviso exclusivo da conta B')

  // Sem isto, a troca de conta cancela a requisição de A no navegador e a
  // resposta atrasada nunca chega ao código. Desligado o cancelamento, a
  // resposta chega e quem barra é a conferência de conta do painel.
  if (semCancelamento) {
    await page.addInitScript(() => { AbortController.prototype.abort = () => {} })
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await entrar(page, contaA)
  await expect(page.getByRole('button', { name: 'Notificações: 2 avisos não lidos', exact: true })).toBeVisible()

  return { avisos: await segurarListaDeAvisos(page), contaB }
}

async function conferirSoContaB(page, avisos, { entregaEsperada = false } = {}) {
  const sino = page.getByRole('button', { name: 'Notificações: 1 aviso não lido', exact: true })

  await expect(sino).toBeVisible()
  await sino.click()

  const painel = page.getByRole('dialog', { name: 'Notificações' })

  await expect(painel.getByText('Aviso exclusivo da conta B')).toBeVisible()
  await expect(painel.getByRole('status').filter({ hasText: 'não lido' })).toHaveText('1 não lido')

  // A resposta de A chega só agora, depois de B já estar na tela.
  avisos.liberar()
  await page.waitForTimeout(800)

  await expect(painel.getByText('Aviso exclusivo da conta B')).toBeVisible()
  if (entregaEsperada) expect(avisos.entregues, 'a resposta atrasada de A precisa ter chegado ao navegador').toBe(1)
  await expect(painel.getByText(/conta A/)).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('Aviso exclusivo da conta A')
  await expect(page.getByRole('button', { name: 'Notificações: 1 aviso não lido', exact: true })).toBeVisible()
  await expect(painel.getByRole('status').filter({ hasText: 'não lido' })).toHaveText('1 não lido')
}

test('troca de conta A → B: resposta atrasada de A não aparece na lista nem no emblema', async ({ page, cenario }) => {
  const { avisos, contaB } = await preparar(page, cenario)

  // Abre o painel de A e segura a resposta da lista.
  avisos.segurar = true
  await page.getByRole('button', { name: 'Notificações: 2 avisos não lidos', exact: true }).click()
  await expect.poll(() => avisos.pedidos).toBeGreaterThan(0)
  await expect(page.getByRole('dialog', { name: 'Notificações' }).getByText('Aviso exclusivo da conta A 1')).toHaveCount(0)

  // B entra pela reautenticação enquanto a resposta de A está presa.
  avisos.segurar = false
  await trocarDeContaPelaReautenticacao(page, contaB)
  await expect(page.getByRole('dialog', { name: 'Notificações' })).toHaveCount(0)

  await conferirSoContaB(page, avisos)
})

test('troca de conta A → B: sem cancelar a requisição, a conferência de conta ainda barra a resposta de A', async ({ page, cenario }) => {
  const { avisos, contaB } = await preparar(page, cenario, { semCancelamento: true })

  avisos.segurar = true
  await page.getByRole('button', { name: 'Notificações: 2 avisos não lidos', exact: true }).click()
  await expect.poll(() => avisos.pedidos).toBeGreaterThan(0)

  avisos.segurar = false
  await trocarDeContaPelaReautenticacao(page, contaB)

  await conferirSoContaB(page, avisos, { entregaEsperada: true })
})
