import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'

const { app } = await import('../../src/app.js')
const { env } = await import('../../src/config/env.js')
const { prisma } = await import('../../src/config/prisma.js')
const { criarAccessToken } = await import('../../src/modules/auth/auth-token.service.js')
const { obterModeloCompetenciaDois } = await import('../../src/modules/temas/temas.competencia-dois.js')
const { gerarCodigoAcessoTurma } = await import('../../src/modules/turmas/turma-code.service.js')
const usuarios = [], turmas = []
let professor, outroAluno, confirmado = false
const auth = u => `Bearer ${criarAccessToken({ usuarioId: u.id, papel: u.papel })}`
async function usuario(papel) {
  const u = await prisma.usuario.create({ data: {
    nome: 'Fixture histórico 55', email: `historico.${randomUUID()}@lexis.example.com`, papel, senhaHash: 'fixture-sem-login-por-senha',
  } })
  usuarios.push(u.id)
  return u
}
before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  assert.equal(url.pathname, '/lexis_test')
  assert.equal((await prisma.$queryRaw`SELECT DATABASE() AS banco`)[0].banco, 'lexis_test')
  confirmado = true
  professor = await usuario('PROFESSOR')
  outroAluno = await usuario('ALUNO')
})
after(async () => {
  if (confirmado && usuarios.length) {
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: usuarios } } })
    await prisma.feedbackVersao.deleteMany({ where: { professorId: { in: usuarios } } })
    await prisma.feedback.deleteMany({ where: { redacao: { alunoId: { in: usuarios } } } })
    await prisma.analiseIA.deleteMany({ where: { solicitadaPorId: { in: usuarios } } })
    await prisma.redacao.deleteMany({ where: { alunoId: { in: usuarios } } })
    await prisma.temaRedacao.deleteMany({ where: { turmaId: { in: turmas } } })
    await prisma.matricula.deleteMany({ where: { alunoId: { in: usuarios } } })
    await prisma.turma.deleteMany({ where: { id: { in: turmas } } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } })
  }
  await prisma.$disconnect()
})
async function turma() {
  const t = await prisma.turma.create({ data: { nome: 'Turma fictícia 55', codigoAcesso: gerarCodigoAcessoTurma(), professorId: professor.id } })
  turmas.push(t.id)
  return t
}
async function tema(t) {
  return prisma.temaRedacao.create({ data: {
    turmaId: t.id, enunciado: 'Direito à educação', descricao: 'Proposta fictícia para regressão de histórico.', prazoEntrega: new Date(Date.now() + 86400000),
    criterios: { create: obterModeloCompetenciaDois().criterios.map((c, i) => ({ ...c, ordem: i + 1 })) },
  } })
}
async function caso() {
  const aluno = await usuario('ALUNO'), a = await turma(), b = await turma()
  const matricula = await entrar(aluno, a)
  return { aluno, a, b, matricula, proposta: await tema(a) }
}
async function entrar(aluno, t) {
  const r = await request(app).post('/api/turmas/entrar').set('Authorization', auth(aluno)).send({ codigoAcesso: t.codigoAcesso }).expect(201)
  return r.body.data.matricula
}
const sair = (aluno, matricula) => request(app).delete('/api/turmas/minha-matricula').set('Authorization', auth(aluno)).send({ matriculaId: matricula.id })
async function rascunho(aluno, proposta, texto = 'Texto fictício sobre o direito à educação.') {
  return (await request(app).put(`/api/aluno/temas/${proposta.id}/redacao`).set('Authorization', auth(aluno)).send({ texto }).expect(200)).body.data.redacao
}
async function enviar(aluno, proposta) {
  return request(app).post(`/api/aluno/temas/${proposta.id}/redacao/enviar`).set('Authorization', auth(aluno)).expect(200)
}
async function corrigir(redacao, valor) {
  await request(app).put(`/api/redacoes/${redacao.id}/feedback`).set('Authorization', auth(professor)).send({
    competencia1: valor, competencia2: valor, competencia3: valor, competencia4: valor, competencia5: valor,
    comentarioGeral: 'Correção humana fictícia.', criterios: [],
  }).expect(200)
  return (await request(app).post(`/api/redacoes/${redacao.id}/feedback/publicar`).set('Authorization', auth(professor)).expect(200)).body.data
}

test('sem matrícula ativa a saída retorna 404 sem encerrar matrícula de outro aluno', async () => {
  const c = await caso()
  const r = await sair(outroAluno, c.matricula).expect(404)
  assert.equal(r.body.error.code, 'ACTIVE_ENROLLMENT_NOT_FOUND')
  assert.equal((await prisma.matricula.findUnique({ where: { id: c.matricula.id } })).status, 'ATIVA')
})

test('reentrada na mesma turma cria matrícula nova e retoma o mesmo rascunho, sem apagar o histórico', async () => {
  const c = await caso(), draft = await rascunho(c.aluno, c.proposta)
  await sair(c.aluno, c.matricula).expect(200)
  const encerrada = await prisma.matricula.findUnique({ where: { id: c.matricula.id } })
  assert.equal(encerrada.status, 'ENCERRADA')
  assert.ok(encerrada.encerradaEm)
  const nova = await entrar(c.aluno, c.a)
  assert.notEqual(nova.id, c.matricula.id)
  const editado = await rascunho(c.aluno, c.proposta, 'Rascunho fictício retomado após reentrada.')
  assert.equal(editado.id, draft.id)
  assert.equal((await prisma.matricula.findUnique({ where: { id: c.matricula.id } })).encerradaEm.toISOString(), encerrada.encerradaEm.toISOString())
  assert.equal(await prisma.matricula.count({ where: { alunoId: c.aluno.id, turmaId: c.a.id, status: 'ATIVA' } }), 1)
  assert.equal(await prisma.matricula.count({ where: { alunoId: c.aluno.id, turmaId: c.a.id, status: 'ENCERRADA' } }), 1)
})

test('após sair, aluno conserva redação, feedback publicado e notificação; outra conta não os acessa', async () => {
  const c = await caso(), reda = await rascunho(c.aluno, c.proposta)
  await enviar(c.aluno, c.proposta)
  const publicada = await corrigir(reda, 160)
  await sair(c.aluno, c.matricula).expect(200)
  const lista = await request(app).get('/api/aluno/redacoes').set('Authorization', auth(c.aluno)).expect(200)
  assert.ok(lista.body.data.redacoes.some(r => r.id === reda.id))
  await request(app).get(`/api/aluno/redacoes/${reda.id}`).set('Authorization', auth(c.aluno)).expect(200)
  const feedback = await request(app).get(`/api/aluno/redacoes/${reda.id}/feedback`).set('Authorization', auth(c.aluno)).expect(200)
  assert.equal(feedback.body.data.feedback.id, publicada.feedback.id)
  const avisos = await request(app).get('/api/aluno/notificacoes').set('Authorization', auth(c.aluno)).expect(200)
  assert.ok(avisos.body.data.notificacoes.some(n => n.id === publicada.notificacao.id))
  await request(app).patch(`/api/aluno/notificacoes/${publicada.notificacao.id}/lida`).set('Authorization', auth(c.aluno)).expect(200)
  for (const sufixo of ['', '/feedback']) await request(app).get(`/api/aluno/redacoes/${reda.id}${sufixo}`).set('Authorization', auth(outroAluno)).expect(404)
  await request(app).patch(`/api/aluno/notificacoes/${publicada.notificacao.id}/lida`).set('Authorization', auth(outroAluno)).expect(404)
})

test('troca de turma bloqueia escrita e envio na proposta antiga, preservando o rascunho próprio', async () => {
  const c = await caso(), draft = await rascunho(c.aluno, c.proposta)
  await sair(c.aluno, c.matricula).expect(200)
  await entrar(c.aluno, c.b)
  const raiz = `/api/aluno/temas/${c.proposta.id}/redacao`
  const salvar = await request(app).put(raiz).set('Authorization', auth(c.aluno)).send({ texto: 'Não deve substituir o histórico.' }).expect(404)
  assert.equal(salvar.body.error.code, 'ESSAY_TOPIC_NOT_FOUND')
  await request(app).post(`${raiz}/enviar`).set('Authorization', auth(c.aluno)).expect(404)
  const antiga = (await request(app).get(`/api/aluno/redacoes/${draft.id}`).set('Authorization', auth(c.aluno)).expect(200)).body.data.redacao
  assert.equal(antiga.texto, draft.texto)
  assert.equal(antiga.status, 'RASCUNHO')
})

test('ex-aluno sai da lista ativa do professor, mas sua entrega continua no histórico da turma', async () => {
  const c = await caso(), reda = await rascunho(c.aluno, c.proposta)
  await enviar(c.aluno, c.proposta)
  await sair(c.aluno, c.matricula).expect(200)
  const ativos = await request(app).get(`/api/turmas/${c.a.id}/alunos`).set('Authorization', auth(professor)).expect(200)
  assert.equal(ativos.body.data.matriculas.some(m => m.aluno.id === c.aluno.id), false)
  const entregas = await request(app).get(`/api/turmas/${c.a.id}/redacoes`).set('Authorization', auth(professor)).expect(200)
  assert.ok(entregas.body.data.redacoes.some(r => r.id === reda.id))
})

test('desempenho permanece histórico de todas as turmas sem duplicar correção após reentrada', async () => {
  const c = await caso(), a = await rascunho(c.aluno, c.proposta)
  await enviar(c.aluno, c.proposta)
  await corrigir(a, 160)
  await sair(c.aluno, c.matricula).expect(200)
  const matriculaB = await entrar(c.aluno, c.b), propostaB = await tema(c.b), b = await rascunho(c.aluno, propostaB)
  await enviar(c.aluno, propostaB)
  await corrigir(b, 120)
  await sair(c.aluno, matriculaB).expect(200)
  await entrar(c.aluno, c.a)
  const r = await request(app).get('/api/aluno/desempenho').set('Authorization', auth(c.aluno)).expect(200)
  assert.deepEqual(r.body.data.desempenho, { mediaGeral: 700, ultimaNota: 600, mediaCompetencia2: 140, totalEnviadas: 2, totalCorrigidas: 2 })
  const isolado = await request(app).get('/api/aluno/desempenho').set('Authorization', auth(outroAluno)).expect(200)
  assert.equal(isolado.body.data.desempenho.totalCorrigidas, 0)
})

test('arquivamento encerra matrícula, preserva leitura e faz nova saída retornar 404 sem apagar redação', async () => {
  const c = await caso(), reda = await rascunho(c.aluno, c.proposta)
  await enviar(c.aluno, c.proposta)
  await corrigir(reda, 160)
  await request(app).post(`/api/turmas/${c.a.id}/arquivar`).set('Authorization', auth(professor)).expect(200)
  const r = await sair(c.aluno, c.matricula).expect(404)
  assert.equal(r.body.error.code, 'ACTIVE_ENROLLMENT_NOT_FOUND')
  await request(app).get(`/api/aluno/redacoes/${reda.id}/feedback`).set('Authorization', auth(c.aluno)).expect(200)
  const entrega = await prisma.redacao.findUnique({ where: { id: reda.id } })
  assert.equal(entrega.texto, reda.texto)
  assert.equal(entrega.status, 'AVALIADA')
})
