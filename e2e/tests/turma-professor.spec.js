import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, matricular, novaTurma } from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

const dialogo = (page, nome) => page.getByRole('dialog', { name: nome })

test('renomear a turma muda o nome em toda parte e preserva código e alunos', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma para renomear')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const outroAluno = await cenario.criarConta('ALUNO')
  const novoNome = 'Turma renomeada pelo teste'

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await expect(page.getByRole('heading', { level: 1, name: 'Turma para renomear' })).toBeVisible()
  await page.getByRole('button', { name: 'Renomear turma', exact: true }).click()
  const caixa = dialogo(page, 'Renomear turma')
  await caixa.getByLabel('Nome da turma').fill(novoNome)
  await caixa.getByRole('button', { name: 'Salvar nome', exact: true }).click()

  await expect(page.getByRole('heading', { level: 1, name: novoNome })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Turma renomeada para “' + novoNome + '”.' })).toBeVisible()
  await expect(caixa).toHaveCount(0)

  // API: nome novo; código e alunos ativos preservados.
  const doServidor = (await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma
  expect(doServidor.nome).toBe(novoNome)
  expect(doServidor.codigoAcesso).toBe(turma.codigoAcesso)
  expect(doServidor.ativa).toBe(true)
  const matriculas = (await cenario.chamada(cenario.professor, 'get', `/api/turmas/${turma.id}/alunos`)).matriculas
  expect(matriculas.map((m) => m.aluno.id)).toEqual([aluno.id])
  // O código não mudou: o mesmo código continua entrando.
  await cenario.chamada(outroAluno, 'post', '/api/turmas/entrar', { codigoAcesso: turma.codigoAcesso }, 201)

  // A lista de turmas mostra o nome novo.
  await page.goto('/professor/turmas')
  await expect(page.getByRole('link', { name: 'Abrir turma ' + novoNome, exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir turma Turma para renomear', exact: true })).toHaveCount(0)
})

test('renomear recusa nome inválido sem alterar a turma', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma nome inválido')
  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await page.getByRole('button', { name: 'Renomear turma', exact: true }).click()
  const caixa = dialogo(page, 'Renomear turma')
  await caixa.getByLabel('Nome da turma').fill('A')
  await caixa.getByRole('button', { name: 'Salvar nome', exact: true }).click()
  await expect(caixa.getByText(/pelo menos 2 caracteres/i)).toBeVisible()
  await expect(caixa).toBeVisible()
  expect((await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma.nome).toBe('Turma nome inválido')
})

test('gerar novo código invalida o antigo, ativa o novo e mantém quem já está matriculado', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma para novo código')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const visitanteAntes = await cenario.criarConta('ALUNO')
  const visitanteDepois = await cenario.criarConta('ALUNO')

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await expect(page.getByText(turma.codigoAcesso, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Gerar novo código', exact: true }).click()
  const caixa = dialogo(page, 'Gerar um novo código de acesso?')
  await expect(caixa).toContainText('O código atual deixa de funcionar imediatamente.')
  await caixa.getByRole('button', { name: 'Gerar novo código', exact: true }).click()
  await expect(caixa).toHaveCount(0)

  const novo = (await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma.codigoAcesso
  expect(novo).not.toBe(turma.codigoAcesso)
  await expect(page.getByText(novo, { exact: true }).first()).toBeVisible()
  await expect(page.getByText(turma.codigoAcesso, { exact: true })).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Novo código de acesso: ' + novo })).toBeVisible()

  // Código antigo é recusado; o novo entra; quem já estava matriculado continua.
  await cenario.chamada(visitanteAntes, 'post', '/api/turmas/entrar', { codigoAcesso: turma.codigoAcesso }, 404)
  await cenario.chamada(visitanteDepois, 'post', '/api/turmas/entrar', { codigoAcesso: novo }, 201)
  const matricula = await cenario.chamada(aluno, 'get', '/api/turmas/minha-matricula')
  expect(matricula.matricula.turma.id).toBe(turma.id)
  const ativos = (await cenario.chamada(cenario.professor, 'get', `/api/turmas/${turma.id}/alunos`)).matriculas.map((m) => m.aluno.id)
  expect(ativos.sort()).toEqual([aluno.id, visitanteDepois.id].sort())
})

test('arquivar a turma encerra as matrículas, avisa o aluno e bloqueia qualquer alteração', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma para arquivar')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const visitante = await cenario.criarConta('ALUNO')

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await page.getByRole('button', { name: 'Arquivar turma', exact: true }).click()
  const caixa = dialogo(page, 'Arquivar a turma “Turma para arquivar”?')
  await expect(caixa).toContainText('As matrículas de todos os alunos são encerradas.')
  await caixa.getByRole('button', { name: 'Arquivar turma', exact: true }).click()

  // Interface: arquivada, sem ações de gestão nem criação de tema.
  await expect(page.getByRole('status').filter({ hasText: 'Turma arquivada. As matrículas ativas foram encerradas.' })).toBeVisible()
  await expect(page.getByText('Situação').locator('xpath=following-sibling::dd')).toHaveText('Arquivada')
  await expect(page.getByText(/Esta turma está arquivada desde/)).toBeVisible()
  for (const nome of ['Renomear turma', 'Gerar novo código', 'Arquivar turma']) {
    await expect(page.getByRole('button', { name: nome, exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('link', { name: 'Criar tema de redação' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Lista indisponível em turma arquivada' })).toBeVisible()

  // API: estado arquivado e nenhuma alteração aceita.
  const arquivada = (await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma
  expect(arquivada.ativa).toBe(false)
  expect(arquivada.arquivadaEm).toBeTruthy()
  await cenario.chamada(cenario.professor, 'patch', '/api/turmas/' + turma.id, { nome: 'Nome após arquivar' }, 409)
  await cenario.chamada(cenario.professor, 'post', `/api/turmas/${turma.id}/regenerar-codigo`, undefined, 409)
  await cenario.chamada(cenario.professor, 'post', `/api/turmas/${turma.id}/arquivar`, undefined, 409)
  await cenario.chamada(cenario.professor, 'get', `/api/turmas/${turma.id}/alunos`, undefined, 409)
  expect((await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma.nome).toBe('Turma para arquivar')

  // Aluno: matrícula encerrada, aviso interno e o código não serve mais.
  await cenario.chamada(aluno, 'get', '/api/turmas/minha-matricula', undefined, 404)
  const avisos = (await cenario.chamada(aluno, 'get', '/api/aluno/notificacoes')).notificacoes
  expect(avisos.map((n) => n.tipo)).toContain('TURMA_ARQUIVADA')
  await cenario.chamada(visitante, 'post', '/api/turmas/entrar', { codigoAcesso: turma.codigoAcesso }, 404)

  // Lista de turmas: aparece só no filtro Arquivadas.
  await page.goto('/professor/turmas')
  await page.getByRole('button', { name: 'Ativas', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Abrir turma Turma para arquivar', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Arquivadas', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Abrir turma Turma para arquivar', exact: true })).toBeVisible()
})
