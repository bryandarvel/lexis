import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { criarAccessToken } from '../../src/modules/auth/auth-token.service.js'

const usuarios = []
let turma, tema, redacao, alheia, token
let confirmado = false
before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
  for (const papel of ['PROFESSOR', 'ALUNO', 'ALUNO']) {
    usuarios.push(await prisma.usuario.create({ data: {
      nome: 'Fixture feedback indisponível', papel,
      email: `feedback.45.${randomUUID()}@lexis.example.com`, senhaHash: 'fixture-sem-login',
    } }))
  }
  turma = await prisma.turma.create({ data: { nome: 'Fixture 45', codigoAcesso: randomUUID(), professorId: usuarios[0].id } })
  tema = await prisma.temaRedacao.create({ data: { turmaId: turma.id, enunciado: 'Proposta fictícia', descricao: 'Somente teste', prazoEntrega: new Date(Date.now() + 86400000) } })
  redacao = await prisma.redacao.create({ data: { alunoId: usuarios[1].id, temaId: tema.id, texto: 'Texto fictício.' } })
  alheia = await prisma.redacao.create({ data: { alunoId: usuarios[2].id, temaId: tema.id, texto: 'Outro texto fictício.' } })
  token = criarAccessToken({ usuarioId: usuarios[1].id, papel: 'ALUNO' })
})
after(async () => {
  if (confirmado) {
    await prisma.redacao.deleteMany({ where: { alunoId: { in: usuarios.map(u => u.id) } } })
    if (tema) await prisma.temaRedacao.delete({ where: { id: tema.id } })
    if (turma) await prisma.turma.delete({ where: { id: turma.id } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } })
  }
  await prisma.$disconnect()
})
for (const status of ['RASCUNHO', 'ENVIADA', 'AVALIADA']) {
  test(`redação própria ${status} sem publicação informa feedback indisponível`, async () => {
    await prisma.redacao.update({ where: { id: redacao.id }, data: { status } })
    const resposta = await request(app).get(`/api/aluno/redacoes/${redacao.id}/feedback`)
      .set('Authorization', `Bearer ${token}`).expect(404)
    assert.deepEqual(resposta.body, { error: {
      code: 'FEEDBACK_NOT_AVAILABLE', message: 'A correção desta redação ainda não está disponível.',
    } })
  })
}
test('redação alheia e ID inexistente têm a mesma resposta sem vazamento', async () => {
  const respostas = []
  for (const id of [alheia.id, randomUUID()]) {
    respostas.push((await request(app).get(`/api/aluno/redacoes/${id}/feedback`)
      .set('Authorization', `Bearer ${token}`).expect(404)).body)
  }
  assert.deepEqual(respostas[0], respostas[1])
  assert.equal(respostas[0].error.code, 'ESSAY_NOT_FOUND')
})
