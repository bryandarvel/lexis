import { test, expect, entrar } from '../fixtures-professor.js'
import {
  bloquearRedeExterna, criteriosDoModelo, enviarRedacaoPorApi, matricular, novaProposta, novaTurma, prazoParaCampo,
} from '../professor-helpers.js'

test.beforeEach(async ({ context }) => { await bloquearRedeExterna(context) })

const dialogo = (page, nome) => page.getByRole('dialog', { name: nome })

/*
 * Issue #194: trocar de proposta deixou de remontar a página inteira. O
 * cabeçalho e a régua de temas ficam de pé — e a régua é justamente o que se
 * está clicando — enquanto só o detalhe é substituído. Em troca disso, nada da
 * proposta anterior pode sobreviver: nem diálogo aberto, nem aviso.
 */
test('trocar de proposta preserva a régua e não carrega nada da anterior', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma da troca de proposta')
  const primeira = await novaProposta(cenario, turma, 'Primeira proposta da régua')
  const segunda = await novaProposta(cenario, turma, 'Segunda proposta da régua')

  await entrar(page, cenario.professor)
  await page.goto('/professor/temas/' + primeira.id)

  const regua = page.getByRole('navigation', { name: 'Temas desta turma' })

  await expect(page.getByRole('heading', { level: 1, name: primeira.enunciado })).toBeVisible()

  // O mesmo nó da régua precisa sobreviver à troca: se a página remontasse,
  // ele seria descartado e a navegação piscaria a cada clique.
  const noDaRegua = await regua.elementHandle()

  await regua.getByRole('link', { name: segunda.enunciado, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: segunda.enunciado })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(segunda.id + '$'))
  expect(await noDaRegua.evaluate((no) => no.isConnected)).toBe(true)
  await expect(regua.getByRole('link', { name: segunda.enunciado, exact: true }))
    .toHaveAttribute('aria-current', 'page')

  // Voltar pelo navegador devolve a primeira inteira, não um esqueleto preso.
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: primeira.enunciado })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Enunciado', exact: true })).toBeVisible()

  /*
   * O diálogo é modal e bloqueia a régua, então a única forma de trocar de
   * proposta com ele aberto é pelo histórico do navegador — e por ali ele não
   * pode atravessar para a proposta seguinte.
   */
  await page.getByRole('button', { name: 'Editar proposta', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Editar proposta' })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1, name: segunda.enunciado })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar proposta', exact: true })).toBeEnabled()
})

test('exclui proposta arquivada vazia, mas um rascunho já bloqueia a ação', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma das propostas fictícias')
  const livre = await novaProposta(cenario, turma, 'Proposta vazia para excluir')
  const comRascunho = await novaProposta(cenario, turma, 'Proposta com rascunho')
  const aluno = await cenario.criarConta('ALUNO', { prepararNoBanco: true })
  await matricular(cenario, aluno, turma)
  await cenario.chamada(aluno, 'put', `/api/aluno/temas/${comRascunho.id}/redacao`, { texto: 'Rascunho fictício não enviado.' })
  await cenario.chamada(cenario.professor, 'post', `/api/temas/${comRascunho.id}/arquivar`)
  await page.setViewportSize({ width: 360, height: 800 })
  await entrar(page, cenario.professor)
  await page.goto('/professor/temas/' + comRascunho.id)
  const excluir = page.getByRole('button', { name: 'Excluir definitivamente', exact: true })
  await expect(excluir).toBeDisabled()
  await expect(page.getByText(/tem rascunhos ou redações no histórico/)).toBeVisible()
  await page.goto('/professor/temas/' + livre.id)
  await expect(page.getByText('Arquive a proposta antes de excluí-la.')).toBeVisible()
  await expect(excluir).toBeDisabled()
  await page.getByRole('button', { name: 'Arquivar proposta', exact: true }).click()
  await dialogo(page, 'Arquivar esta proposta?').getByRole('button', { name: 'Arquivar proposta' }).click()
  await excluir.click()
  const caixa = dialogo(page, 'Excluir esta proposta?')
  await expect(caixa).toContainText(livre.enunciado)
  await expect(caixa.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await caixa.getByRole('button', { name: 'Excluir definitivamente' }).click()
  await expect(page).toHaveURL('/professor/turmas/' + turma.id)
  await expect(page.getByText('Proposta excluída definitivamente.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir tema ' + livre.enunciado })).toHaveCount(0)
})

test('editar uma proposta sem redações altera enunciado, descrição, orientações e prazo', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma para editar proposta')
  const proposta = await novaProposta(cenario, turma, 'Proposta antes da edição')
  const prazoNovo = prazoParaCampo(12)

  await entrar(page, cenario.professor)
  await page.goto('/professor/temas/' + proposta.id)
  await expect(page.getByRole('heading', { level: 1, name: 'Proposta antes da edição' })).toBeVisible()
  await page.getByRole('button', { name: 'Editar proposta', exact: true }).click()
  const caixa = dialogo(page, 'Editar proposta')
  await expect(caixa.getByLabel('Enunciado')).toBeEnabled()
  await caixa.getByLabel('Enunciado').fill('Proposta depois da edição')
  await caixa.getByLabel('Descrição').fill('Descrição fictícia atualizada pelo teste.')
  await caixa.getByLabel('Orientações e textos motivadores').fill('Orientações fictícias novas.')
  await caixa.getByLabel('Prazo de entrega').fill(prazoNovo)
  await caixa.getByRole('button', { name: 'Salvar proposta', exact: true }).click()

  await expect(caixa).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Proposta depois da edição' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Proposta atualizada.' })).toBeVisible()
  await expect(page.getByText('Descrição fictícia atualizada pelo teste.')).toBeVisible()
  await expect(page.getByText('Orientações fictícias novas.')).toBeVisible()

  const salva = (await cenario.chamada(cenario.professor, 'get', '/api/temas/' + proposta.id)).tema
  expect(salva.enunciado).toBe('Proposta depois da edição')
  expect(salva.descricao).toBe('Descrição fictícia atualizada pelo teste.')
  expect(salva.instrucoes).toBe('Orientações fictícias novas.')
  expect(new Date(salva.prazoEntrega).getTime()).toBe(new Date(prazoNovo).getTime())
  expect(salva.criterios.map((c) => c.nome)).toEqual(proposta.criterios.map((c) => c.nome))
  expect(salva.ativo).toBe(true)
})

test('editar recusa enunciado curto demais e prazo no passado sem alterar a proposta', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma edição inválida')
  const proposta = await novaProposta(cenario, turma, 'Proposta com edição inválida')

  await entrar(page, cenario.professor)
  await page.goto('/professor/temas/' + proposta.id)
  await page.getByRole('button', { name: 'Editar proposta', exact: true }).click()
  const caixa = dialogo(page, 'Editar proposta')
  await caixa.getByLabel('Enunciado').fill('Ab')
  await caixa.getByRole('button', { name: 'Salvar proposta', exact: true }).click()
  await expect(caixa.getByText(/O enunciado deve possuir entre/)).toBeVisible()
  await caixa.getByLabel('Enunciado').fill('Proposta com edição inválida')
  await caixa.getByLabel('Prazo de entrega').fill(prazoParaCampo(-3))
  await caixa.getByRole('button', { name: 'Salvar proposta', exact: true }).click()
  await expect(caixa).toBeVisible()
  await expect(caixa.getByRole('alert').or(caixa.locator('.topic-campo-erro')).first()).toBeVisible()

  const intacta = (await cenario.chamada(cenario.professor, 'get', '/api/temas/' + proposta.id)).tema
  expect(intacta.enunciado).toBe('Proposta com edição inválida')
  expect(intacta.prazoEntrega).toBe(proposta.prazoEntrega)
  // A API também recusa o prazo vencido.
  await cenario.chamada(cenario.professor, 'patch', '/api/temas/' + proposta.id, { prazoEntrega: new Date(Date.now() - 86400000).toISOString() }, 422)
})

test('com redação enviada só o prazo pode mudar, na interface e na API', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma proposta com entrega')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const proposta = await novaProposta(cenario, turma, 'Proposta que já recebeu redação')
  await enviarRedacaoPorApi(cenario, aluno, proposta.id)
  const prazoNovo = prazoParaCampo(20)

  await entrar(page, cenario.professor)
  await page.goto('/professor/temas/' + proposta.id)
  await expect(page.getByText('Esta proposta já recebeu redações: só o prazo de entrega pode mudar.')).toBeVisible()
  await expect(page.getByText('Critérios bloqueados após a primeira entrega, para preservar a avaliação da turma.')).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Adicionar critério personalizado' })).toBeDisabled()
  await page.getByRole('button', { name: 'Editar proposta', exact: true }).click()
  const caixa = dialogo(page, 'Editar proposta')
  await expect(caixa.getByLabel('Enunciado')).toBeDisabled()
  await expect(caixa.getByLabel('Descrição')).toBeDisabled()
  await expect(caixa.getByLabel('Orientações e textos motivadores')).toBeDisabled()
  await expect(caixa.getByLabel('Prazo de entrega')).toBeEnabled()
  await caixa.getByLabel('Prazo de entrega').fill(prazoNovo)
  await caixa.getByRole('button', { name: 'Salvar proposta', exact: true }).click()
  await expect(caixa).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Proposta atualizada.' })).toBeVisible()

  const salva = (await cenario.chamada(cenario.professor, 'get', '/api/temas/' + proposta.id)).tema
  expect(new Date(salva.prazoEntrega).getTime()).toBe(new Date(prazoNovo).getTime())
  expect(salva.enunciado).toBe('Proposta que já recebeu redação')

  // API: qualquer outro campo é recusado e nada muda; critérios também ficam travados.
  await cenario.chamada(cenario.professor, 'patch', '/api/temas/' + proposta.id, { enunciado: 'Enunciado alterado após a entrega' }, 409)
  await cenario.chamada(cenario.professor, 'put', `/api/temas/${proposta.id}/criterios`, { criterios: await criteriosDoModelo() }, 409)
  const depois = (await cenario.chamada(cenario.professor, 'get', '/api/temas/' + proposta.id)).tema
  expect(depois.enunciado).toBe('Proposta que já recebeu redação')
  expect(depois.descricao).toBe(proposta.descricao)
})

test('arquivar a proposta tira ela dos alunos, preserva as redações e bloqueia alterações', async ({ page, cenario }) => {
  const turma = await novaTurma(cenario, 'Turma para arquivar proposta')
  const aluno = await cenario.criarConta('ALUNO')
  await matricular(cenario, aluno, turma)
  const proposta = await novaProposta(cenario, turma, 'Proposta que será arquivada')
  const outra = await novaProposta(cenario, turma, 'Proposta que continua ativa')
  const entregue = await enviarRedacaoPorApi(cenario, aluno, proposta.id)
  expect((await cenario.chamada(aluno, 'get', '/api/aluno/temas')).temas.map((t) => t.id).sort()).toEqual([proposta.id, outra.id].sort())

  await entrar(page, cenario.professor)
  await page.goto('/professor/temas/' + proposta.id)
  await page.getByRole('button', { name: 'Arquivar proposta', exact: true }).click()
  // Issue #175: o enunciado saiu do título e foi para o cartão de resumo.
  const caixa = dialogo(page, 'Arquivar esta proposta?')
  await expect(caixa).toContainText('Proposta que será arquivada')
  await expect(caixa).toContainText('As redações já enviadas e as correções publicadas permanecem.')
  await caixa.getByRole('button', { name: 'Arquivar proposta', exact: true }).click()

  // Interface: marcada como arquivada, sem edição nem novo arquivamento.
  await expect(caixa).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Proposta arquivada. Os alunos não a veem mais.' })).toBeVisible()
  await expect(page.locator('.topic-subtitle')).toContainText('Proposta arquivada')
  await expect(page.getByText('Esta proposta está arquivada e não pode ser alterada enquanto estiver arquivada.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar proposta', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Arquivar proposta', exact: true })).toHaveCount(0)

  // API: arquivada, nada alterável; a outra proposta segue ativa.
  const arquivada = (await cenario.chamada(cenario.professor, 'get', '/api/temas/' + proposta.id)).tema
  expect(arquivada.ativo).toBe(false)
  expect(arquivada.arquivadoEm).toBeTruthy()
  await cenario.chamada(cenario.professor, 'patch', '/api/temas/' + proposta.id, { prazoEntrega: new Date(Date.now() + 9 * 86400000).toISOString() }, 409)
  await cenario.chamada(cenario.professor, 'post', `/api/temas/${proposta.id}/arquivar`, undefined, 409)
  expect((await cenario.chamada(cenario.professor, 'get', '/api/temas/' + outra.id)).tema.ativo).toBe(true)

  // Aluno: não vê nem abre a proposta arquivada, mas a redação enviada continua no histórico.
  expect((await cenario.chamada(aluno, 'get', '/api/aluno/temas')).temas.map((t) => t.id)).toEqual([outra.id])
  await cenario.chamada(aluno, 'get', '/api/aluno/temas/' + proposta.id, undefined, 404)
  await cenario.chamada(aluno, 'put', `/api/aluno/temas/${proposta.id}/redacao`, { texto: 'Tentativa em proposta arquivada.' }, 404)
  expect((await cenario.chamada(aluno, 'get', '/api/aluno/redacoes')).redacoes.find((r) => r.id === entregue.id)?.status).toBe('ENVIADA')
})
