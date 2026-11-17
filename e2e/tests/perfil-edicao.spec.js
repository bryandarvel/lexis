import { randomUUID } from 'node:crypto'
import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna } from '../professor-helpers.js'

for (const papel of ['ALUNO', 'PROFESSOR']) {
  test(`perfil ${papel}: nome, senha incorreta, troca de senha e sessão preservada`, async ({ page, context, cenario }) => {
    await bloquearRedeExterna(context)
    const pessoa = await cenario.criarConta(papel)
    await entrar(page, pessoa)
    await page.goto('/' + papel.toLowerCase() + '/perfil')
    const campoNome = page.getByRole('textbox', { name: 'Nome', exact: true })
    await campoNome.fill('Pessoa fictícia revisada')
    await page.getByRole('button', { name: 'Salvar nome', exact: true }).click()
    await expect(page.getByText('Nome atualizado.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu do usuário: Pessoa fictícia revisada' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Editar nome', exact: true })).toHaveCount(0)
    const atual = page.getByLabel('Senha atual', { exact: true })
    const nova = page.getByLabel('Nova senha', { exact: true })
    const confirmar = page.getByLabel('Confirme a nova senha', { exact: true })
    const senhaNova = 'Ficticia!' + randomUUID()
    await atual.fill('SenhaIncorreta123!')
    await nova.fill(senhaNova)
    await confirmar.fill(senhaNova)
    await page.getByRole('button', { name: 'Mostrar senha', exact: true }).first().click()
    await expect(atual).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click()
    await expect(atual).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Alterar senha', exact: true }).click()
    await expect(page.getByText('A senha atual está incorreta.', { exact: true })).toBeVisible()
    await expect(atual).toBeFocused()
    await atual.fill(pessoa.senha)
    await page.getByRole('button', { name: 'Alterar senha', exact: true }).click()
    await expect(page.getByText('Senha alterada. Você continua conectado; as outras sessões foram encerradas.', { exact: true })).toBeVisible()
    await expect(atual).toHaveValue('')
    await expect(nova).toHaveValue('')
    await expect(confirmar).toHaveValue('')
    await page.reload()
    await expect(campoNome).toHaveValue('Pessoa fictícia revisada')
    const formulario = await page.getByRole('region', { name: 'Conta', exact: true }).boundingBox()
    expect(formulario.width).toBeGreaterThan(100)
  })

  test(`perfil ${papel}: resposta de nome atrasada de A não altera a sessão de B`, async ({ page, context, cenario }) => {
    await bloquearRedeExterna(context)
    const contaA = papel === 'PROFESSOR' ? cenario.professor : await cenario.criarConta(papel)
    const contaB = papel === 'PROFESSOR' ? cenario.outroProfessor : await cenario.criarConta(papel)
    let liberar
    const aguardar = new Promise(resolve => { liberar = resolve })
    let recebida = false
    let entregue = false
    await page.route('**/api/auth/me', async (rota) => {
      if (rota.request().method() !== 'PATCH') return rota.continue()
      const resposta = await rota.fetch()
      recebida = true
      await aguardar
      await rota.fulfill({ response: resposta })
      entregue = true
    })
    try {
      await entrar(page, contaA)
      await page.goto('/' + papel.toLowerCase() + '/perfil')
      await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Nome exclusivo da conta A')
      await page.getByLabel('Nova senha', { exact: true }).fill('RascunhoPrivado123!')
      await page.getByRole('button', { name: 'Salvar nome', exact: true }).click()
      await expect.poll(() => recebida).toBe(true)
      await page.evaluate(() => dispatchEvent(new CustomEvent('lexis:sessao-expirada')))
      const dialogo = page.getByRole('dialog', { name: 'Sua sessão expirou' })
      await dialogo.getByLabel('E-mail', { exact: true }).fill(contaB.email)
      await dialogo.getByLabel('Senha', { exact: true }).fill(contaB.senha)
      await dialogo.getByRole('button', { name: 'Entrar e continuar' }).click()
      await expect(dialogo).toHaveCount(0)
      await expect(page.getByRole('textbox', { name: 'Nome', exact: true })).toHaveValue(contaB.nome)
      await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue('')
      liberar()
      await expect.poll(() => entregue).toBe(true)
      await expect(page.getByRole('textbox', { name: 'Nome', exact: true })).toHaveValue(contaB.nome)
      await expect(page.getByRole('button', { name: 'Menu do usuário: ' + contaB.nome })).toBeVisible()
      await expect(page.getByText('Nome atualizado.', { exact: true })).toHaveCount(0)
    } finally {
      liberar()
    }
  })
}
