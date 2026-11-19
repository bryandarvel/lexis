import { test, expect, entrar } from '../fixtures-professor.js'
import { bloquearRedeExterna, matricular, novaProposta, novaTurma } from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

const dialogo = (page, nome) => page.getByRole('dialog', { name: nome })
const gerenciar = (page) => page.getByText('Gerenciar', { exact: true }).click()

test('renomear a turma muda o nome em toda parte e preserva código e alunos', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma para renomear')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const outroAluno = await cenario.criarConta('ALUNO')
  const novoNome = 'Turma renomeada pelo teste'

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await expect(page.getByRole('heading', { level: 1, name: 'Turma para renomear' })).toBeVisible()
  await gerenciar(page)
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
  await gerenciar(page)
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
  await gerenciar(page)
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
  await gerenciar(page)
  await page.getByRole('button', { name: 'Arquivar turma', exact: true }).click()
  const caixa = dialogo(page, 'Arquivar a turma “Turma para arquivar”?')
  await expect(caixa).toContainText('As matrículas de todos os alunos são encerradas.')
  await caixa.getByRole('button', { name: 'Arquivar turma', exact: true }).click()

  // Interface: arquivada, sem ações de gestão nem criação de tema.
  await expect(page.getByRole('status').filter({ hasText: 'Turma arquivada. As matrículas ativas foram encerradas.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Turma arquivada', exact: true })).toBeVisible()
  await expect(page.getByText(/Esta turma está arquivada desde/)).toBeVisible()
  for (const nome of ['Renomear turma', 'Gerar novo código', 'Arquivar turma']) {
    await expect(page.getByRole('button', { name: nome, exact: true })).toHaveCount(0)
  }
  await expect(page.getByRole('link', { name: 'Nova proposta' })).toHaveCount(0)
  await page.getByRole('link', { name: /^Alunos \(/ }).click()
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

/*
 * Issue #175: a lista de propostas da turma ganhou busca pelo enunciado,
 * filtro por situação e uma ordem própria — a que ainda recebe redações vem
 * antes da arquivada.
 */
test('propostas da turma filtram por situação, buscam pelo enunciado e ordenam', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma das propostas')
  const aberta = await novaProposta(cenario, turma, 'Inclusão digital nas escolas')
  const guardada = await novaProposta(cenario, turma, 'Mobilidade urbana nas capitais')
  await cenario.chamada(cenario.professor, 'post', `/api/temas/${guardada.id}/arquivar`, undefined, 200)

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)

  const cartoes = page.locator('.turma-temas .class-card h3')
  const busca = page.getByRole('searchbox', { name: 'Buscar proposta pelo enunciado' })
  const filtro = (nome) => page.getByRole('group', { name: 'Filtrar propostas por situação' })
    .getByRole('button', { name: nome, exact: true })

  // A arquivada existe, mas fica depois da que ainda recebe redações.
  await expect(cartoes).toHaveText([aberta.enunciado, guardada.enunciado])

  await filtro('Ativas').click()
  await expect(cartoes).toHaveText([aberta.enunciado])

  await filtro('Arquivadas').click()
  await expect(cartoes).toHaveText([guardada.enunciado])

  await filtro('Todas').click()
  await busca.fill('MOBILIDADE')
  await expect(cartoes).toHaveText([guardada.enunciado])
  await expect(page.getByRole('status').filter({ hasText: '1 proposta de 2.' })).toBeVisible()

  // Sem resultado, o estado vazio devolve a lista inteira.
  await busca.fill('repertório sociocultural')
  await expect(cartoes).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Nenhuma proposta nesta busca' })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(cartoes).toHaveText([aberta.enunciado, guardada.enunciado])
})

/*
 * Issue #175: as três ações de gestão saíram da linha do código de acesso e
 * passaram a viver num diálogo aberto pelo botão "Gerenciar" do cabeçalho.
 */
test('o botão Gerenciar abre o diálogo com as três ações e devolve o foco', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma da gestão')

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)

  const botao = page.getByRole('button', { name: 'Gerenciar', exact: true })
  await botao.click()

  const caixa = dialogo(page, 'Gerenciar turma')
  await expect(caixa).toContainText(turma.nome)
  await expect(caixa).toContainText(turma.codigoAcesso)
  for (const nome of ['Renomear turma', 'Gerar novo código', 'Arquivar turma']) {
    await expect(caixa.getByRole('button', { name: nome, exact: true })).toBeVisible()
  }

  await page.keyboard.press('Escape')
  await expect(caixa).toHaveCount(0)
  await expect(botao).toBeFocused()
})
