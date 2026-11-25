import { randomUUID } from 'node:crypto'
import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, novaTurma } from '../professor-helpers.js'
import { API_URL, CAIXA_FICTICIA, WEB_URL } from '../runtime.js'

async function receberLink(request, tipo) {
  const resposta = await request.post(API_URL + '/__e2e/email/' + tipo)
  const { link } = await resposta.json()
  // Não incluir o endereço completo em mensagens de asserção.
  expect(Boolean(link && new URL(link).origin === WEB_URL && new URL(link).pathname === '/' + tipo)).toBe(true)
  return link
}

async function abrirLink(page, link) {
  // Evita que o URL temporário completo seja exibido em um erro de navegação.
  try {
    await page.goto(link)
  } catch {
    throw new Error('Não foi possível abrir o link fictício.')
  }
}

for (const papel of ['ALUNO', 'PROFESSOR']) {
  test(`perfil ${papel}: nome protegido, redefinição por e-mail e encerramento de sessão`, async ({ page, context, request, cenario }) => {
    await bloquearRedeExterna(context)
    if (papel === 'ALUNO') await page.setViewportSize({ width: 360, height: 800 })
    const pessoa = await cenario.criarConta(papel, { prepararNoBanco: true })
    await entrar(page, pessoa)
    await page.goto('/' + papel.toLowerCase() + '/perfil')
    const campoNome = page.getByRole('textbox', { name: 'Nome', exact: true })
    await expect(campoNome).toBeVisible()
    if (papel === 'ALUNO') {
      const tema = page.getByRole('button', { name: 'Tema escuro' })
      await expect(tema).toHaveAttribute('aria-pressed', 'false')
      await tema.click()
      await expect(tema).toHaveAttribute('aria-pressed', 'true')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await campoNome.fill('Pessoa fictícia revisada')
    const salvar = page.getByRole('button', { name: 'Salvar nome', exact: true })
    await salvar.focus()
    await page.keyboard.press('Enter')
    const nome = page.getByRole('dialog', { name: 'Confirmar alteração do nome' })
    const atual = nome.getByLabel('Senha atual', { exact: true })
    await expect(atual).toBeFocused()
    const limites = await nome.boundingBox()
    expect(limites.x >= 0 && limites.x + limites.width <= page.viewportSize().width).toBe(true)
    await page.keyboard.press('Escape')
    await expect(salvar).toBeFocused()
    await salvar.click()
    await atual.fill('SenhaIncorreta123!')
    await nome.getByRole('button', { name: 'Confirmar novo nome' }).click()
    await expect(nome.getByText('A senha atual está incorreta.', { exact: true })).toBeVisible()
    await expect(atual).toBeFocused()
    await atual.fill(pessoa.senha)
    await nome.getByRole('button', { name: 'Confirmar novo nome' }).click()
    await expect(page.getByText('Nome atualizado.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu do usuário: Pessoa fictícia revisada' })).toBeVisible()

    const trocar = page.getByRole('button', { name: 'Redefinir senha por e-mail', exact: true })
    await trocar.click()
    const senha = page.getByRole('dialog', { name: 'Redefinir senha por e-mail' })
    await expect(senha.getByLabel('Nova senha', { exact: true })).toHaveCount(0)
    await senha.getByLabel('Senha atual', { exact: true }).fill(pessoa.senha)
    await senha.getByRole('button', { name: 'Enviar link de redefinição' }).click()
    await expect(page.getByText(/solicitação foi recebida/)).toBeVisible()
    await expect(page).toHaveURL(new RegExp('/' + papel.toLowerCase() + '/perfil$'))

    const link = await receberLink(request, 'redefinir-senha')
    await abrirLink(page, link)
    await expect(page).toHaveURL('/redefinir-senha')
    const senhaNova = 'Ficticia!' + randomUUID()
    const novaSenha = page.getByLabel('Nova senha', { exact: true })
    await novaSenha.fill(senhaNova)
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill(senhaNova)
    await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Senha redefinida. Entre com a nova senha.')).toBeVisible()
    await entrar(page, { ...pessoa, senha: senhaNova })
    await page.goto('/' + papel.toLowerCase() + '/perfil')
    await expect(campoNome).toHaveValue('Pessoa fictícia revisada')
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
      await page.getByRole('button', { name: 'Salvar nome', exact: true }).click()
      const confirmacao = page.getByRole('dialog', { name: 'Confirmar alteração do nome' })
      await confirmacao.getByLabel('Senha atual', { exact: true }).fill(contaA.senha)
      await confirmacao.getByRole('button', { name: 'Confirmar novo nome' }).click()
      await expect.poll(() => recebida).toBe(true)
      await page.evaluate(() => dispatchEvent(new CustomEvent('lexis:sessao-expirada')))
      const dialogo = page.getByRole('dialog', { name: 'Sua sessão expirou' })
      await dialogo.getByLabel('E-mail', { exact: true }).fill(contaB.email)
      await dialogo.getByLabel('Senha', { exact: true }).fill(contaB.senha)
      await dialogo.getByRole('button', { name: 'Entrar e continuar' }).click()
      await expect(dialogo).toHaveCount(0)
      await expect(page.getByRole('textbox', { name: 'Nome', exact: true })).toHaveValue(contaB.nome)
      await expect(confirmacao).toHaveCount(0)
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

test('e-mail muda apenas após confirmação; o link não permanece no endereço e só funciona uma vez', async ({ page, context, request, cenario }) => {
  await bloquearRedeExterna(context)
  const pessoa = await cenario.criarConta('ALUNO', { prepararNoBanco: true })
  await page.goto('/confirmar-email?token=' + 'a'.repeat(64))
  await expect(page).toHaveURL('/confirmar-email')
  await expect(page.getByText(/link é inválido, expirou ou já foi usado/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar e-mail' })).toHaveCount(0)
  await entrar(page, pessoa)
  await page.goto('/aluno/perfil')
  await page.getByRole('button', { name: 'Alterar e-mail' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Alterar e-mail' })
  await dialogo.getByLabel('Novo e-mail').fill(CAIXA_FICTICIA)
  await dialogo.getByLabel('Senha atual').fill(pessoa.senha)
  await dialogo.getByRole('button', { name: 'Enviar link de confirmação' }).click()
  await expect(page.getByText(/Confira o novo endereço para confirmar/)).toBeVisible()
  const conta = page.getByRole('region', { name: 'Conta', exact: true })
  await expect(conta.getByText(pessoa.email, { exact: true })).toBeVisible()
  const link = await receberLink(request, 'confirmar-email')
  await abrirLink(page, link)
  await expect(page).toHaveURL('/confirmar-email')

  // A primeira tentativa falha sem chegar ao servidor. A mesma tela permite tentar de novo.
  await page.route('**/api/auth/confirmar-email', rota => rota.abort('failed'), { times: 1 })
  const confirmar = page.getByRole('button', { name: 'Confirmar e-mail' })
  await confirmar.click()
  await expect(page.getByText(/Verifique a conexão e tente novamente/)).toBeVisible()
  await confirmar.click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByText('E-mail confirmado. Entre com o novo endereço.')).toBeVisible()
  await abrirLink(page, link)
  await expect(page).toHaveURL('/confirmar-email')
  await confirmar.click()
  await expect(page.getByText(/link é inválido, expirou ou já foi usado/)).toBeVisible()
  await entrar(page, { ...pessoa, email: CAIXA_FICTICIA })
})

test('aluno exclui a própria conta; professor precisa arquivar turmas ativas', async ({ page, context, cenario }) => {
  await bloquearRedeExterna(context)
  const professor = await cenario.criarConta('PROFESSOR', { prepararNoBanco: true })
  const turma = await novaTurma(cenario, 'Turma fictícia para bloquear exclusão', professor)
  const aluno = await cenario.criarConta('ALUNO', { prepararNoBanco: true })
  for (const pessoa of [professor, aluno]) {
    await entrar(page, pessoa)
    const perfil = '/' + pessoa.papel.toLowerCase() + '/perfil'
    await page.goto(perfil)
    const abrir = page.getByRole('button', { name: 'Excluir minha conta' })
    await abrir.click()
    const dialogo = page.getByRole('dialog', { name: 'Excluir sua conta?' })
    await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(abrir).toBeFocused()
    await abrir.click()
    await expect(dialogo).toContainText('Redações e correções permanecem no histórico.')
    await dialogo.getByLabel('Senha atual').fill(pessoa.senha)
    const confirmar = dialogo.getByRole('button', { name: 'Excluir minha conta' })
    await confirmar.click()
    if (pessoa.papel === 'PROFESSOR') {
      await expect(dialogo.getByRole('link', { name: 'Ver minhas turmas' })).toBeVisible()
      await cenario.chamada(professor, 'post', '/api/turmas/' + turma.id + '/arquivar')
      await dialogo.getByLabel('Senha atual').fill(pessoa.senha)
      await confirmar.click()
    }
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Conta excluída. O acesso foi encerrado.')).toBeVisible()
    await page.goto(perfil)
    await expect(page).toHaveURL('/login')
  }
})
