import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { criarAccessToken } from '../../src/modules/auth/auth-token.service.js'

const usuarios = []
const turmas = []
let confirmado = false
let professorToken, outroToken, alunoToken

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
  for (const papel of ['PROFESSOR', 'PROFESSOR', 'ALUNO']) {
    usuarios.push(await prisma.usuario.create({ data: {
      nome: 'Fixture reabertura de turma', papel,
      email: `reabrir.65.${randomUUID()}@lexis.example.com`, senhaHash: 'fixture-sem-login',
    } }))
  }
  const tokens = usuarios.map(u => criarAccessToken({ usuarioId: u.id, papel: u.papel }))
  ;[professorToken, outroToken, alunoToken] = tokens
})

after(async () => {
  if (confirmado) {
    const ids = turmas.map(t => t.id)
    await prisma.matricula.deleteMany({ where: { turmaId: { in: ids } } })
    await prisma.temaRedacao.deleteMany({ where: { turmaId: { in: ids } } })
    await prisma.turma.deleteMany({ where: { id: { in: ids } } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } })
  }
  await prisma.$disconnect()
})

async function criarTurma(ativa = false) {
  const turma = await prisma.turma.create({ data: {
    nome: 'Turma fictícia para reabrir', professorId: usuarios[0].id,
    codigoAcesso: randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase().replace(/[01]/g, 'A'),
    ativa, arquivadaEm: ativa ? null : new Date(),
  } })
  turmas.push(turma)
  return turma
}

function reabrir(id, token = professorToken) {
  const chamada = request(app).post(`/api/turmas/${id}/reabrir`)
  return token ? chamada.set('Authorization', `Bearer ${token}`) : chamada
}

test('reabre sem restaurar matrículas nem propostas arquivadas e permite nova entrada pelo código', async () => {
  const turma = await criarTurma(true)
  const antiga = await prisma.matricula.create({ data: { turmaId: turma.id, alunoId: usuarios[2].id } })
  const tema = await prisma.temaRedacao.create({ data: {
    turmaId: turma.id, enunciado: 'Proposta fictícia arquivada', descricao: 'Somente teste',
    ativo: false, arquivadoEm: new Date(), prazoEntrega: new Date('2026-01-01'),
  } })
  await request(app).post(`/api/turmas/${turma.id}/arquivar`)
    .set('Authorization', `Bearer ${professorToken}`).expect(200)
  const encerrada = await prisma.matricula.findUnique({ where: { id: antiga.id } })
  const resposta = await reabrir(turma.id).expect(200)
  assert.equal(resposta.body.data.turma.ativa, true)
  assert.equal(resposta.body.data.turma.arquivadaEm, null)
  assert.equal(resposta.body.data.turma.codigoAcesso, turma.codigoAcesso)
  assert.equal(resposta.body.data.turma.quantidadeAlunosAtivos, 0)
  assert.deepEqual(await prisma.matricula.findUnique({ where: { id: antiga.id } }), encerrada)
  assert.equal((await prisma.temaRedacao.findUnique({ where: { id: tema.id } })).ativo, false)
  const entrada = await request(app).post('/api/turmas/entrar')
    .set('Authorization', `Bearer ${alunoToken}`).send({ codigoAcesso: turma.codigoAcesso }).expect(201)
  assert.notEqual(entrada.body.data.matricula.id, antiga.id)
  assert.equal(entrada.body.data.matricula.status, 'ATIVA')
  assert.equal((await prisma.matricula.findUnique({ where: { id: antiga.id } })).status, 'ENCERRADA')
})

test('recusa reabrir turma já ativa sem mudar o código ou datas', async () => {
  const turma = await criarTurma(true)
  const resposta = await reabrir(turma.id).expect(409)
  assert.equal(resposta.body.error.code, 'CLASS_ALREADY_ACTIVE')
  assert.deepEqual(await prisma.turma.findUnique({ where: { id: turma.id } }), turma)
})

test('oculta turma alheia assim como ID inexistente, sem reabrir', async () => {
  const turma = await criarTurma()
  const alheia = await reabrir(turma.id, outroToken).expect(404)
  const ausente = await reabrir(randomUUID(), outroToken).expect(404)
  assert.deepEqual(alheia.body, ausente.body)
  assert.equal(alheia.body.error.code, 'CLASS_NOT_FOUND')
  assert.equal((await prisma.turma.findUnique({ where: { id: turma.id } })).ativa, false)
})

test('exige autenticação, papel professor e identificador UUID', async () => {
  const turma = await criarTurma()
  await reabrir(turma.id, null).expect(401)
  await reabrir(turma.id, alunoToken).expect(403)
  await reabrir('id-invalido').expect(422)
})

test('duas reaberturas concorrentes não aplicam a mesma transição duas vezes', async () => {
  const turma = await criarTurma()
  const respostas = await Promise.all([reabrir(turma.id), reabrir(turma.id)])
  assert.deepEqual(respostas.map(r => r.status).sort(), [200, 409])
  assert.equal(respostas.find(r => r.status === 409).body.error.code, 'CLASS_ALREADY_ACTIVE')
  assert.equal((await prisma.turma.findUnique({ where: { id: turma.id } })).ativa, true)
})
