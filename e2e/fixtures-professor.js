// Fixture dos specs do professor (#66).
//
// O cadastro tem limite de 50 por hora por IP (limitarCadastro) e a fixture de
// fixtures.js cria 4 contas por teste. Para os specs do professor caberem na
// mesma execução, os dois professores são criados UMA vez por worker; cada
// teste cria só os alunos, turmas e propostas de que precisa, pela API. Tudo
// o que for criado aqui é removido no fim do worker, na mesma ordem da fixture
// existente, sem apagar nada à força: se uma limpeza falhar por chave
// estrangeira, o erro aparece com a tabela envolvida.
import { randomUUID } from 'node:crypto'
import { test as base, expect } from '@playwright/test'
import { API_URL, configurarAmbiente } from './runtime.js'

configurarAmbiente()
const { prisma } = await import('../backend/src/config/prisma.js')
export { expect }

async function confirmarBanco() {
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  expect(db.banco).toBe('lexis_test')
}

export const test = base.extend({
  escopo: [async ({ playwright }, use) => {
    await confirmarBanco()
    const api = await playwright.request.newContext({ baseURL: API_URL })
    const usuarios = []
    const turmas = []

    async function chamada(pessoa, metodo, rota, dados, status = 200) {
      const resposta = await api[metodo](rota, {
        headers: pessoa ? { Authorization: 'Bearer ' + pessoa.token } : {},
        ...(dados ? { data: dados } : {}),
      })
      expect(resposta.status(), metodo + ' ' + rota).toBe(status)
      return (await resposta.json()).data
    }
    async function criarConta(papel) {
      const dados = {
        nome: 'Fixture B34 ' + papel,
        email: 'e2e.' + randomUUID() + '@lexis.example.com',
        senha: 'Ficticia!' + randomUUID(), papel,
      }
      const cadastro = await chamada(null, 'post', '/api/auth/cadastro', dados, 201)
      usuarios.push(cadastro.usuario.id)
      const login = await chamada(null, 'post', '/api/auth/login', { email: dados.email, senha: dados.senha })
      return { ...dados, id: cadastro.usuario.id, token: login.accessToken }
    }
    const registrarTurma = (id) => { turmas.push(id) }

    try {
      const professor = await criarConta('PROFESSOR')
      const outroProfessor = await criarConta('PROFESSOR')
      await use({ professor, outroProfessor, chamada, criarConta, registrarTurma, prisma })
    } finally {
      await confirmarBanco()
      if (usuarios.length) {
        const ids = { in: usuarios }
        await prisma.notificacao.deleteMany({ where: { usuarioId: ids } })
        await prisma.feedbackVersao.deleteMany({ where: { professorId: ids } })
        await prisma.feedback.deleteMany({ where: { redacao: { alunoId: ids } } })
        await prisma.analiseIA.deleteMany({ where: { solicitadaPorId: ids } })
        await prisma.redacao.deleteMany({ where: { alunoId: ids } })
        await prisma.temaRedacao.deleteMany({ where: { turmaId: { in: turmas } } })
        await prisma.matricula.deleteMany({ where: { alunoId: ids } })
        await prisma.turma.deleteMany({ where: { id: { in: turmas } } })
        await prisma.usuario.deleteMany({ where: { id: ids } })
        expect(await prisma.usuario.count({ where: { id: ids } })).toBe(0)
        expect(await prisma.turma.count({ where: { id: { in: turmas } } })).toBe(0)
      }
      await api.dispose()
    }
  }, { scope: 'worker' }],
  cenario: async ({ escopo }, use) => { await use(escopo) },
})
test.afterAll(async () => { await prisma.$disconnect() })

export async function entrar(page, pessoa) {
  await page.goto('/login')
  await page.getByRole('radio', { name: pessoa.papel === 'ALUNO' ? 'Aluno' : 'Professor', exact: true }).check()
  await page.getByRole('textbox', { name: 'E-mail institucional', exact: true }).fill(pessoa.email)
  await page.getByLabel('Senha', { exact: true }).fill(pessoa.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(new RegExp('/' + pessoa.papel.toLowerCase() + '$'))
}
