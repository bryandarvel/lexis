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
  const u = await prisma.usuario.create({ data: { nome: 'Aluno fictício saída 55', email: `saida55.${randomUUID()}@lexis.example.com`, papel, senhaHash: 'fixture-sem-login-por-senha' } })
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
  const aluno = await usuario()
  const turma = await prisma.turma.create({ data: { nome: `Turma saída ${turmas.length + 1}`, codigoAcesso: gerarCodigoAcessoTurma(), professorId: professor.id } })
  turmas.push(turma.id)
  const matricula = await prisma.matricula.create({ data: { alunoId: aluno.id, turmaId: turma.id } })
  return { aluno, turma, matricula }
}
const sair = (c, matriculaId = c.matricula.id, aluno = c.aluno) => request(app).delete('/api/turmas/minha-matricula').set('Authorization', auth(aluno)).send({ matriculaId })
const avisos = () => prisma.notificacao.findMany({ where: { usuarioId: professor.id, tipo: 'ALUNO_SAIU_TURMA' }, orderBy: { criadaEm: 'asc' } })

test('saída voluntária notifica somente o professor responsável, com leitura autorizada e sem e-mail', async () => {
  const c = await caso(), antes = (await avisos()).length
  const r = await sair(c).expect(200)
  assert.equal(r.body.data.matricula.id, c.matricula.id)
  assert.equal(r.body.data.matricula.status, 'ENCERRADA')
  const ns = await avisos()
  assert.equal(ns.length, antes + 1)
  const n = ns.at(-1)
  assert.match(n.mensagem, new RegExp(c.turma.nome))
  assert.match(n.mensagem, /Aluno fictício saída 55/)
  for (const campo of ['emailDestino', 'statusEmail', 'feedbackVersaoId', 'redacaoId']) assert.equal(n[campo], null)
  const lista = await request(app).get('/api/professor/notificacoes').set('Authorization', auth(professor)).expect(200)
  const dto = lista.body.data.notificacoes.find(x => x.id === n.id)
  assert.equal(dto.tipo, 'ALUNO_SAIU_TURMA')
  assert.equal(dto.redacao, null)
  assert.equal(dto.feedbackVersao, null)
  assert.ok(lista.body.data.totalNaoLidas >= 1)
  const outraLista = await request(app).get('/api/professor/notificacoes').set('Authorization', auth(intruso)).expect(200)
  assert.ok(!outraLista.body.data.notificacoes.some(x => x.id === n.id))
  await request(app).patch(`/api/professor/notificacoes/${n.id}/lida`).set('Authorization', auth(intruso)).expect(404)
  await request(app).patch(`/api/professor/notificacoes/${n.id}/lida`).set('Authorization', auth(c.aluno)).expect(403)
  const lida = await request(app).patch(`/api/professor/notificacoes/${n.id}/lida`).set('Authorization', auth(professor)).expect(200)
  const repetida = await request(app).patch(`/api/professor/notificacoes/${n.id}/lida`).set('Authorization', auth(professor)).expect(200)
  assert.equal(lida.body.data.notificacao.lidaEm, repetida.body.data.notificacao.lidaEm)
  assert.equal(await prisma.notificacao.count({ where: { usuarioId: c.aluno.id } }), 0)
})

test('ID não confirmado, matrícula de outra conta e nova saída sem vínculo não criam aviso', async () => {
  const c = await caso(), outro = await caso(), antes = (await avisos()).length
  const conflito = await sair(c, outro.matricula.id).expect(409)
  assert.equal(conflito.body.error.code, 'ACTIVE_ENROLLMENT_CHANGED')
  assert.equal((await avisos()).length, antes)
  assert.equal((await prisma.matricula.findUnique({ where: { id: c.matricula.id } })).status, 'ATIVA')
  assert.equal((await prisma.matricula.findUnique({ where: { id: outro.matricula.id } })).status, 'ATIVA')
  await sair(c).expect(200)
  await sair(c).expect(404)
  assert.equal((await avisos()).length, antes + 1)
  await sair(c, c.matricula.id, professor).expect(403)
  assert.equal((await avisos()).length, antes + 1)
})

test('duas saídas simultâneas encerram uma matrícula e criam um único aviso', async () => {
  const c = await caso(), antes = (await avisos()).length
  const resultados = await Promise.all([sair(c), sair(c)])
  assert.deepEqual(resultados.map(r => r.status).sort(), [200, 404])
  assert.equal((await avisos()).length, antes + 1)
})

test('reentrar e sair novamente gera outro evento sem apagar a matrícula anterior', async () => {
  const c = await caso(), antes = (await avisos()).length
  await sair(c).expect(200)
  const entrada = await request(app).post('/api/turmas/entrar').set('Authorization', auth(c.aluno)).send({ codigoAcesso: c.turma.codigoAcesso }).expect(201)
  const nova = entrada.body.data.matricula
  assert.notEqual(nova.id, c.matricula.id)
  await sair(c, nova.id).expect(200)
  assert.equal((await avisos()).length, antes + 2)
  assert.equal(await prisma.matricula.count({ where: { alunoId: c.aluno.id, turmaId: c.turma.id, status: 'ENCERRADA' } }), 2)
})

test('falha ao gravar o aviso desfaz a saída inteira, sem expor detalhe interno', async t => {
  const c = await caso(), antes = (await avisos()).length
  const original = prisma.$transaction
  const executar = original.bind(prisma)
  prisma.$transaction = (callback, opcoes) => executar(tx => callback(new Proxy(tx, {
    get(target, prop) {
      if (prop !== 'notificacao') {
        const valor = target[prop]
        return typeof valor === 'function' ? valor.bind(target) : valor
      }
      return new Proxy(target.notificacao, { get(modelo, operacao) {
        if (operacao === 'create') return async () => { throw new Error('DETALHE_PRIVADO_FIXTURE_55') }
        const valor = modelo[operacao]
        return typeof valor === 'function' ? valor.bind(modelo) : valor
      } })
    },
  })), opcoes)
  t.after(() => { prisma.$transaction = original })
  const r = await sair(c).expect(500)
  assert.equal(r.body.error.code, 'INTERNAL_ERROR')
  assert.ok(!JSON.stringify(r.body).includes('DETALHE_PRIVADO_FIXTURE_55'))
  const matricula = await prisma.matricula.findUnique({ where: { id: c.matricula.id } })
  assert.equal(matricula.status, 'ATIVA')
  assert.equal(matricula.encerradaEm, null)
  assert.equal((await avisos()).length, antes)
})

test('desvincular ou arquivar não finge uma saída voluntária para o professor', async () => {
  const c = await caso(), outro = await caso(), antes = (await avisos()).length
  await request(app).delete(`/api/turmas/${c.turma.id}/alunos/${c.aluno.id}`).set('Authorization', auth(professor)).expect(200)
  await request(app).post(`/api/turmas/${outro.turma.id}/arquivar`).set('Authorization', auth(professor)).expect(200)
  assert.equal((await avisos()).length, antes)
  await sair(outro).expect(404)
  assert.equal((await avisos()).length, antes)
})
