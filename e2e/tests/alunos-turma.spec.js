import { test, expect, entrar } from '../fixtures-professor.js'
import {
  bloquearRedeExterna, enviarRedacaoPorApi, matricular, novaProposta, novaTurma,
} from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

// Todas as contas da fixture têm o mesmo nome; o e-mail (único) identifica a linha.
const linhaDoAluno = (page, aluno) => page.getByRole('listitem').filter({ hasText: aluno.email })

test('a lista mostra só os alunos com matrícula ativa da turma, e o resumo acompanha', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma com alunos')
  const primeiro = await cenario.criarConta('ALUNO')
  const segundo = await cenario.criarConta('ALUNO')
  const deOutraTurma = await cenario.criarConta('ALUNO')
  await matricular(cenario, primeiro, turma)
  await matricular(cenario, segundo, turma)
  const outra = await novaTurma(cenario, 'Outra turma do mesmo professor')
  await matricular(cenario, deOutraTurma, outra)

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  const secao = page.getByRole('region', { name: 'Alunos da turma' })
  await expect(secao.getByText('2 alunos ativos')).toBeVisible()
  for (const aluno of [primeiro, segundo]) {
    await expect(linhaDoAluno(page, aluno)).toBeVisible()
    await expect(linhaDoAluno(page, aluno)).toContainText('Matrícula ativa')
    await expect(linhaDoAluno(page, aluno)).toContainText('Entrou em')
  }
  await expect(linhaDoAluno(page, deOutraTurma)).toHaveCount(0)

  // Mesma informação na API: duas matrículas ativas, só dessa turma.
  const matriculas = (await cenario.chamada(cenario.professor, 'get', `/api/turmas/${turma.id}/alunos`)).matriculas
  expect(matriculas.map((m) => m.aluno.id).sort()).toEqual([primeiro.id, segundo.id].sort())
  expect((await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma.quantidadeAlunosAtivos).toBe(2)
})

test('turma sem alunos mostra o estado vazio com o código de acesso', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma vazia')
  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await expect(page.getByRole('heading', { name: 'Nenhum aluno nesta turma' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Alunos da turma' }).getByText(turma.codigoAcesso, { exact: true })).toBeVisible()
})

test('desvincular encerra a matrícula, avisa o aluno, tira o acesso e preserva o histórico', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma para desvincular')
  const saindo = await cenario.criarConta('ALUNO')
  const ficando = await cenario.criarConta('ALUNO')
  await matricular(cenario, saindo, turma)
  await matricular(cenario, ficando, turma)
  const proposta = await novaProposta(cenario, turma, 'Proposta da turma que será desvinculada')
  // O aluno que sai já entregou uma redação; ela precisa continuar acessível.
  const entregue = await enviarRedacaoPorApi(cenario, saindo, proposta.id)
  expect((await cenario.chamada(saindo, 'get', '/api/aluno/temas')).temas.map((t) => t.id)).toContain(proposta.id)

  await entrar(page, cenario.professor)
  await page.goto('/professor/turmas/' + turma.id)
  await expect(linhaDoAluno(page, saindo)).toBeVisible()
  await linhaDoAluno(page, saindo).getByRole('button', { name: /Desvincular/ }).click()
  const caixa = page.getByRole('dialog', { name: /Desvincular .* da turma\?/ })
  await expect(caixa).toContainText('A matrícula é encerrada e o aluno deixa de ver as propostas desta turma.')
  await caixa.getByRole('button', { name: 'Desvincular aluno', exact: true }).click()

  // Interface: o aluno some da lista ativa, o outro permanece, com aviso na tela.
  await expect(caixa).toHaveCount(0)
  await expect(linhaDoAluno(page, saindo)).toHaveCount(0)
  await expect(linhaDoAluno(page, ficando)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'foi desvinculado da turma.' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Alunos da turma' }).getByText('1 aluno ativo')).toBeVisible()

  // API do professor: só o outro aluno segue ativo.
  const ativos = (await cenario.chamada(cenario.professor, 'get', `/api/turmas/${turma.id}/alunos`)).matriculas.map((m) => m.aluno.id)
  expect(ativos).toEqual([ficando.id])
  expect((await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma.quantidadeAlunosAtivos).toBe(1)

  // Banco de teste: a matrícula foi encerrada, não apagada.
  const matricula = await cenario.prisma.matricula.findFirst({ where: { alunoId: saindo.id, turmaId: turma.id } })
  expect(matricula.status).toBe('ENCERRADA')
  expect(matricula.encerradaEm).toBeTruthy()

  // Aluno: perdeu o acesso à turma e às propostas, recebeu o aviso interno, manteve a redação.
  await cenario.chamada(saindo, 'get', '/api/turmas/minha-matricula', undefined, 404)
  // Sem matrícula ativa a API do aluno nem lista propostas: responde 404 ACTIVE_ENROLLMENT_NOT_FOUND.
  await cenario.chamada(saindo, 'get', '/api/aluno/temas', undefined, 404)
  await cenario.chamada(saindo, 'get', '/api/aluno/temas/' + proposta.id, undefined, 404)
  const aviso = (await cenario.chamada(saindo, 'get', '/api/aluno/notificacoes')).notificacoes.find((n) => n.tipo === 'MATRICULA_ENCERRADA')
  expect(aviso).toBeTruthy()
  expect(aviso.titulo).toBe('Vínculo com a turma encerrado')
  expect(aviso.mensagem).toContain('Turma para desvincular')
  const redacoes = (await cenario.chamada(saindo, 'get', '/api/aluno/redacoes')).redacoes
  expect(redacoes.find((r) => r.id === entregue.id)?.status).toBe('ENVIADA')
  // O aluno que ficou não foi afetado.
  expect((await cenario.chamada(ficando, 'get', '/api/turmas/minha-matricula')).matricula.turma.id).toBe(turma.id)
  expect((await cenario.chamada(ficando, 'get', '/api/aluno/notificacoes')).notificacoes.some((n) => n.tipo === 'MATRICULA_ENCERRADA')).toBe(false)

  // O aviso aparece na tela do aluno que saiu.
  const contextoAluno = await page.context().browser().newContext()
  try {
    await bloquearRedeExterna(contextoAluno)
    const paginaAluno = await contextoAluno.newPage()
    await entrar(paginaAluno, saindo)
    await paginaAluno.goto('/aluno/notificacoes')
    await expect(paginaAluno.getByText('Vínculo com a turma encerrado').first()).toBeVisible()
  } finally {
    await contextoAluno.close()
  }

  // Quem saiu pode voltar com o código: a matrícula nova é separada da encerrada.
  await cenario.chamada(saindo, 'post', '/api/turmas/entrar', { codigoAcesso: turma.codigoAcesso }, 201)
  expect((await cenario.chamada(cenario.professor, 'get', `/api/turmas/${turma.id}/alunos`)).matriculas.map((m) => m.aluno.id).sort())
    .toEqual([ficando.id, saindo.id].sort())
})

test('desvincular um aluno que não está na turma é recusado sem alterar nada', async ({ cenario }) => {
  const turma = await novaTurma(cenario, 'Turma desvincular inexistente')
  const estranho = await cenario.criarConta('ALUNO')
  await cenario.chamada(cenario.professor, 'delete', `/api/turmas/${turma.id}/alunos/${estranho.id}`, undefined, 404)
  expect(await cenario.prisma.matricula.count({ where: { alunoId: estranho.id } })).toBe(0)
})
