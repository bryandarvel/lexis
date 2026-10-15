import { randomUUID } from 'node:crypto'
import { test as base, expect } from '@playwright/test'
import { API_URL, configurarAmbiente } from './runtime.js'

configurarAmbiente()
const { prisma } = await import('../backend/src/config/prisma.js')
const { obterModeloCompetenciaDois } = await import('../backend/src/modules/temas/temas.competencia-dois.js')
const texto = 'A educação é um direito assegurado a todos. Rascunho fictício de teste integrado.'
export { expect, texto }

async function confirmarBanco() {
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  expect(db.banco).toBe('lexis_test')
}
export const test = base.extend({
  cenario: async ({ playwright }, use) => {
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
    async function conta(papel) {
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
    try {
      const professor = await conta('PROFESSOR')
      const outroProfessor = await conta('PROFESSOR')
      const aluno = await conta('ALUNO')
      const outroAluno = await conta('ALUNO')
      const turma = (await chamada(professor, 'post', '/api/turmas', { nome: 'Turma fictícia B34' }, 201)).turma
      turmas.push(turma.id)
      const outraTurma = (await chamada(outroProfessor, 'post', '/api/turmas', { nome: 'Outra turma B34' }, 201)).turma
      turmas.push(outraTurma.id)
      await chamada(aluno, 'post', '/api/turmas/entrar', { codigoAcesso: turma.codigoAcesso }, 201)
      await chamada(outroAluno, 'post', '/api/turmas/entrar', { codigoAcesso: outraTurma.codigoAcesso }, 201)
      async function proposta(enunciado, vencida = false) {
        const tema = (await chamada(professor, 'post', '/api/turmas/' + turma.id + '/temas', {
          enunciado, descricao: 'Proposta fictícia de teste, sem conteúdo real.',
          prazoEntrega: new Date(Date.now() + 86400000).toISOString(),
          criterios: obterModeloCompetenciaDois().criterios,
        }, 201)).tema
        // Somente a fixture recém-criada recebe prazo passado para o cenário existente.
        if (vencida) await prisma.temaRedacao.update({
          where: { id: tema.id }, data: { prazoEntrega: new Date(Date.now() - 86400000) },
        })
        return tema
      }
      const tema = await proposta('Proposta principal B34')
      const vencida = await proposta('Proposta vencida B34', true)
      const adicional = await proposta('Outra proposta aberta B34')
      await use({ professor, outroProfessor, aluno, outroAluno, tema, vencida, adicional, chamada, prisma })
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
  },
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
