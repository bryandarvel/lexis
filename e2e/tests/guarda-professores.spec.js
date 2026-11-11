import { test, expect, entrar } from '../fixtures-professor.js'
import {
  bloquearRedeExterna, criteriosDoModelo, enviarRedacaoPorApi, matricular, novaProposta, novaTurma,
} from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

// A fixture cria `professor` e `outroProfessor`. Aqui, tudo é do primeiro; o segundo é o intruso.
test('um professor não vê nem altera a turma e a proposta de outro, na interface e na API', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma protegida')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const proposta = await novaProposta(cenario, turma, 'Proposta protegida')
  const redacao = await enviarRedacaoPorApi(cenario, aluno, proposta.id)
  const intruso = cenario.outroProfessor
  const criterios = await criteriosDoModelo()

  // API: leitura e todas as ações do professor recebem 404, sem revelar que existem.
  const rotas = [
    ['get', `/api/turmas/${turma.id}`],
    ['get', `/api/turmas/${turma.id}/alunos`],
    ['patch', `/api/turmas/${turma.id}`, { nome: 'Invadida' }],
    ['post', `/api/turmas/${turma.id}/regenerar-codigo`],
    ['post', `/api/turmas/${turma.id}/arquivar`],
    ['post', `/api/turmas/${turma.id}/reabrir`],
    ['delete', `/api/turmas/${turma.id}/alunos/${aluno.id}`],
    ['get', `/api/temas/${proposta.id}`],
    ['patch', `/api/temas/${proposta.id}`, { prazoEntrega: new Date(Date.now() + 9 * 86400000).toISOString() }],
    ['put', `/api/temas/${proposta.id}/criterios`, { criterios }],
    ['post', `/api/temas/${proposta.id}/arquivar`],
    ['post', `/api/temas/${proposta.id}/reabrir`],
    ['get', `/api/professor/redacoes/${redacao.id}`],
  ]
  for (const [metodo, rota, dados] of rotas) {
    const resposta = await cenario.chamada(intruso, metodo, rota, dados, 404).catch((erro) => {
      throw new Error(`${metodo.toUpperCase()} ${rota} não respondeu 404 ao outro professor: ${erro.message}`)
    })
    expect(resposta).toBeUndefined()
  }

  // Criar proposta em turma alheia é recusado com 404, como se a turma não existisse.
  await cenario.chamada(intruso, 'post', `/api/turmas/${turma.id}/temas`, {
    enunciado: 'Proposta do intruso', descricao: 'Descrição fictícia do intruso.',
    prazoEntrega: new Date(Date.now() + 86400000).toISOString(), criterios,
  }, 404)

  // A listagem de propostas filtra pelo dono da turma: devolve lista vazia, sem nenhum dado do outro professor.
  expect((await cenario.chamada(intruso, 'get', `/api/turmas/${turma.id}/temas`)).temas).toEqual([])
  // A lista de redações da turma, essa sim, responde 404 ao outro professor.
  await cenario.chamada(intruso, 'get', `/api/turmas/${turma.id}/redacoes`, undefined, 404)

  // Nada mudou para o dono.
  const turmaDoDono = (await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma
  expect(turmaDoDono.nome).toBe('Turma protegida')
  expect(turmaDoDono.ativa).toBe(true)
  expect(turmaDoDono.codigoAcesso).toBe(turma.codigoAcesso)
  expect(turmaDoDono.quantidadeAlunosAtivos).toBe(1)
  const propostaDoDono = (await cenario.chamada(cenario.professor, 'get', '/api/temas/' + proposta.id)).tema
  expect(propostaDoDono.ativo).toBe(true)
  expect(propostaDoDono.prazoEntrega).toBe(proposta.prazoEntrega)
  expect((await cenario.chamada(cenario.professor, 'get', `/api/turmas/${turma.id}/temas`)).temas.map((t) => t.id)).toEqual([proposta.id])

  // As listas do intruso não incluem o que não é dele.
  const turmasDoIntruso = (await cenario.chamada(intruso, 'get', '/api/turmas')).turmas.map((t) => t.id)
  expect(turmasDoIntruso).not.toContain(turma.id)

  // Interface: a turma e a proposta aparecem como erro de "não encontrada", sem nenhum dado.
  await entrar(page, intruso)
  await page.goto('/professor/turmas/' + turma.id)
  await expect(page.getByRole('heading', { name: 'Não foi possível abrir a turma' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Turma não encontrada.')
  await expect(page.getByText('Turma protegida')).toHaveCount(0)
  await expect(page.getByText(turma.codigoAcesso, { exact: true })).toHaveCount(0)
  await expect(page.getByText(aluno.email)).toHaveCount(0)
  await page.goto('/professor/temas/' + proposta.id)
  await expect(page.getByRole('heading', { name: 'Não foi possível abrir a proposta' })).toBeVisible()
  await expect(page.getByText('Proposta protegida')).toHaveCount(0)
  await page.goto('/professor/turmas')
  await expect(page.getByRole('link', { name: 'Abrir turma Turma protegida', exact: true })).toHaveCount(0)
})

test('aluno e visitante sem sessão não acessam as rotas de gestão do professor', async ({ cenario }) => {
  const turma = await novaTurma(cenario, 'Turma só do professor')
  const proposta = await novaProposta(cenario, turma, 'Proposta só do professor')
  const aluno = await cenario.criarConta('ALUNO')

  for (const [metodo, rota, dados] of [
    ['get', `/api/turmas/${turma.id}`],
    ['patch', `/api/turmas/${turma.id}`, { nome: 'Invadida por aluno' }],
    ['post', `/api/turmas/${turma.id}/arquivar`],
    ['post', `/api/temas/${proposta.id}/arquivar`],
    ['patch', `/api/temas/${proposta.id}`, { prazoEntrega: new Date(Date.now() + 9 * 86400000).toISOString() }],
  ]) {
    await cenario.chamada(aluno, metodo, rota, dados, 403)
    await cenario.chamada(null, metodo, rota, dados, 401)
  }
  expect((await cenario.chamada(cenario.professor, 'get', '/api/turmas/' + turma.id)).turma.nome).toBe('Turma só do professor')
  expect((await cenario.chamada(cenario.professor, 'get', '/api/temas/' + proposta.id)).tema.ativo).toBe(true)
})
