import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'

const { app } = await import('../../src/app.js')
const { env } = await import('../../src/config/env.js')
const { prisma } = await import('../../src/config/prisma.js')
const { criarAccessToken } = await import('../../src/modules/auth/auth-token.service.js')
const { gerarCodigoAcessoTurma } = await import('../../src/modules/turmas/turma-code.service.js')
const usuarios = [], turmas = []
let professor, intruso, confirmado = false
const auth = u => `Bearer ${criarAccessToken({ usuarioId: u.id, papel: u.papel })}`
async function usuario(papel = 'ALUNO') {
  const u = await prisma.usuario.create({ data: { nome: 'Fixture aviso 64', email: `aviso64.${randomUUID()}@lexis.example.com`, papel, senhaHash: 'fixture-sem-login-por-senha' } })
  usuarios.push(u.id)
  return u
}
before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  assert.equal((await prisma.$queryRaw`SELECT DATABASE() AS banco`)[0].banco, 'lexis_test')
  confirmado = true
  professor = await usuario('PROFESSOR')
  intruso = await usuario('PROFESSOR')
})
after(async () => {
  if (confirmado && usuarios.length) {
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: usuarios } } })
    await prisma.matricula.deleteMany({ where: { alunoId: { in: usuarios } } })
    await prisma.turma.deleteMany({ where: { id: { in: turmas } } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } })
  }
  await prisma.$disconnect()
})
async function caso() {
  const turma = await prisma.turma.create({ data: { nome: 'Turma fictícia de avisos', codigoAcesso: gerarCodigoAcessoTurma(), professorId: professor.id } })
  turmas.push(turma.id)
  const alunos = [await usuario(), await usuario(), await usuario()]
  for (const [i, aluno] of alunos.entries()) await prisma.matricula.create({ data: { turmaId: turma.id, alunoId: aluno.id, status: i === 2 ? 'ENCERRADA' : 'ATIVA', ...(i === 2 ? { encerradaEm: new Date() } : {}) } })
  return { turma, alunos }
}
const arquivar = c => request(app).post(`/api/turmas/${c.turma.id}/arquivar`).set('Authorization', auth(professor))
const remover = (c, aluno = c.alunos[0], responsavel = professor) => request(app).delete(`/api/turmas/${c.turma.id}/alunos/${aluno.id}`).set('Authorization', auth(responsavel))
const avisos = aluno => prisma.notificacao.findMany({ where: { usuarioId: aluno.id }, orderBy: { criadaEm: 'asc' } })
const entrar = (aluno, turma) => request(app).post('/api/turmas/entrar').set('Authorization', auth(aluno)).send({ codigoAcesso: turma.codigoAcesso }).expect(201)

test('desvinculação cria aviso interno legível somente para o aluno, com leitura idempotente', async () => {
  const c = await caso()
  await remover(c).expect(200)
  const [n] = await avisos(c.alunos[0])
  assert.ok(n, 'aviso não foi criado')
  assert.equal(n.tipo, 'MATRICULA_ENCERRADA')
  assert.match(n.mensagem, /Turma fictícia de avisos/)
  assert.match(n.mensagem, /histórico/)
  for (const campo of ['emailDestino', 'statusEmail', 'feedbackVersaoId', 'redacaoId']) assert.equal(n[campo], null)
  const lista = await request(app).get('/api/aluno/notificacoes').set('Authorization', auth(c.alunos[0])).expect(200)
  assert.ok(lista.body.data.notificacoes.some(x => x.id === n.id && x.feedbackVersao === null))
  await request(app).patch(`/api/aluno/notificacoes/${n.id}/lida`).set('Authorization', auth(c.alunos[1])).expect(404)
  const lida = await request(app).patch(`/api/aluno/notificacoes/${n.id}/lida`).set('Authorization', auth(c.alunos[0])).expect(200)
  const repetida = await request(app).patch(`/api/aluno/notificacoes/${n.id}/lida`).set('Authorization', auth(c.alunos[0])).expect(200)
  assert.equal(lida.body.data.notificacao.lidaEm, repetida.body.data.notificacao.lidaEm)
})

test('arquivamento avisa cada aluno ativo distinto uma vez e não avisa matrícula já encerrada', async () => {
  const c = await caso()
  await prisma.matricula.create({ data: { alunoId: c.alunos[0].id, turmaId: c.turma.id } })
  await arquivar(c).expect(200)
  for (const aluno of c.alunos.slice(0, 2)) {
    const ns = await avisos(aluno)
    assert.equal(ns.length, 1)
    assert.equal(ns[0].tipo, 'TURMA_ARQUIVADA')
    assert.equal(ns[0].statusEmail, null)
    assert.equal(ns[0].emailDestino, null)
  }
  assert.equal((await avisos(c.alunos[2])).length, 0)
  assert.equal(await prisma.matricula.count({ where: { turmaId: c.turma.id, status: 'ATIVA' } }), 0)
  await arquivar(c).expect(409)
  assert.equal((await avisos(c.alunos[0])).length, 1)
})

test('repetir remoção não duplica aviso; reentrada seguida de nova remoção é um evento novo', async () => {
  const c = await caso()
  await remover(c).expect(200)
  await remover(c).expect(404)
  assert.equal((await avisos(c.alunos[0])).length, 1)
  await entrar(c.alunos[0], c.turma)
  await remover(c).expect(200)
  assert.equal((await avisos(c.alunos[0])).length, 2)
})

// Todas as consultas são reais; somente a falha de persistência é injetada.
function substituirMetodo(t, alvo, nome, implementacao) {
  // Os métodos dinâmicos do Proxy Prisma não têm o descriptor exigido por mock.method.
  const original = alvo[nome]
  alvo[nome] = implementacao
  t.after(() => { alvo[nome] = original })
}
function falharNotificacao(t, metodo) {
  const original = prisma.$transaction.bind(prisma)
  substituirMetodo(t, prisma, '$transaction', (callback, opcoes) => original(tx => callback(new Proxy(tx, {
    get(target, prop) {
      if (prop !== 'notificacao') {
        const valor = target[prop]
        return typeof valor === 'function' ? valor.bind(target) : valor
      }
      return new Proxy(target.notificacao, { get(modelo, operacao) {
        if (operacao === metodo) return async () => { throw new Error('DETALHE_PRIVADO_FIXTURE_64') }
        const valor = modelo[operacao]
        return typeof valor === 'function' ? valor.bind(modelo) : valor
      } })
    },
  })), opcoes))
}
for (const operacao of ['arquivar', 'remover']) {
  test(`falha no aviso reverte ${operacao} integralmente sem expor detalhe privado`, async t => {
    const c = await caso()
    falharNotificacao(t, operacao === 'arquivar' ? 'createMany' : 'create')
    const r = await (operacao === 'arquivar' ? arquivar(c) : remover(c)).expect(500)
    assert.doesNotMatch(JSON.stringify(r.body), /DETALHE_PRIVADO/)
    assert.equal((await prisma.turma.findUnique({ where: { id: c.turma.id } })).ativa, true)
    assert.equal(await prisma.matricula.count({ where: { turmaId: c.turma.id, status: 'ATIVA' } }), 2)
    assert.equal((await avisos(c.alunos[0])).length, 0)
  })
}

test('aluno e professor de outra turma não provocam aviso nem encerram o vínculo', async () => {
  const c = await caso()
  await remover(c, c.alunos[0], intruso).expect(404)
  await remover(c, c.alunos[0], c.alunos[1]).expect(403)
  await request(app).post(`/api/turmas/${c.turma.id}/arquivar`).set('Authorization', auth(intruso)).expect(404)
  assert.equal((await avisos(c.alunos[0])).length, 0)
  assert.equal(await prisma.matricula.count({ where: { turmaId: c.turma.id, status: 'ATIVA' } }), 2)
})

test('entrada entre prévia e bloqueio expande o conjunto e recebe o aviso no mesmo arquivamento', { timeout: 15000 }, async t => {
  const c = await caso(), novo = await usuario()
  const previa = Promise.withResolvers(), liberar = Promise.withResolvers()
  const original = prisma.matricula.findMany.bind(prisma.matricula)
  let leituras = 0
  substituirMetodo(t, prisma.matricula, 'findMany', async args => {
    const linhas = await original(args)
    if (args.where?.turmaId === c.turma.id) {
      leituras += 1
      if (leituras === 1) { previa.resolve(); await liberar.promise }
    }
    return linhas
  })
  const operacao = arquivar(c).then(r => r)
  try {
    await previa.promise
    await entrar(novo, c.turma)
    liberar.resolve()
    assert.equal((await operacao).status, 200)
    assert.ok(leituras >= 2)
    assert.equal((await avisos(novo)).length, 1)
    assert.equal(await prisma.matricula.count({ where: { turmaId: c.turma.id, status: 'ATIVA' } }), 0)
  } finally { liberar.resolve(); await Promise.allSettled([operacao]) }
})

test('crescimento contínuo encerra as três tentativas sem arquivar ou notificar parcialmente', { timeout: 15000 }, async t => {
  const c = await caso()
  const original = prisma.matricula.findMany.bind(prisma.matricula)
  let leituras = 0
  substituirMetodo(t, prisma.matricula, 'findMany', async args => {
    const linhas = await original(args)
    if (args.where?.turmaId === c.turma.id) {
      leituras += 1
      await entrar(await usuario(), c.turma)
    }
    return linhas
  })
  const r = await arquivar(c).expect(409)
  assert.equal(r.body.error.code, 'CLASS_ENROLLMENTS_CHANGED')
  assert.equal(leituras, 3)
  assert.equal((await prisma.turma.findUnique({ where: { id: c.turma.id } })).ativa, true)
  assert.equal(await prisma.matricula.count({ where: { turmaId: c.turma.id, status: 'ATIVA' } }), 5)
  assert.equal((await avisos(c.alunos[0])).length, 0)
})
