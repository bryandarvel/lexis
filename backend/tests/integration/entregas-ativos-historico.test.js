import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { criarAccessToken } from '../../src/modules/auth/auth-token.service.js'

const usuarios = []
let turma, tema, outroTema, tokens
let confirmado = false
const resumo = (ativos, entregaram, historicos) => ({
  totalAlunosAtivos: ativos,
  alunosAtivosQueEntregaram: entregaram,
  alunosSemMatriculaAtivaQueEntregaram: historicos,
})

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
  for (const papel of ['PROFESSOR', 'PROFESSOR', ...Array(6).fill('ALUNO')]) {
    usuarios.push(await prisma.usuario.create({ data: {
      nome: 'Fixture contagem de entregas', papel,
      email: `entregas.54.${randomUUID()}@lexis.example.com`, senhaHash: 'fixture-sem-login',
    } }))
  }
  tokens = usuarios.map(u => criarAccessToken({ usuarioId: u.id, papel: u.papel }))
  turma = await prisma.turma.create({ data: {
    professorId: usuarios[0].id, nome: 'Turma fictícia 54', codigoAcesso: randomUUID(),
  } })
  const dadosTema = { turmaId: turma.id, enunciado: 'Proposta fictícia de teste', descricao: 'Somente contagem.', prazoEntrega: new Date(Date.now() + 86400000) }
  tema = await prisma.temaRedacao.create({ data: dadosTema })
  outroTema = await prisma.temaRedacao.create({ data: dadosTema })
  for (let i = 2; i < usuarios.length; i += 1) {
    await prisma.matricula.create({ data: {
      turmaId: turma.id, alunoId: usuarios[i].id, status: i === 2 ? 'ENCERRADA' : 'ATIVA', encerradaEm: i === 2 ? new Date() : null,
    } })
    await prisma.redacao.create({ data: {
      alunoId: usuarios[i].id, temaId: tema.id, texto: 'Texto fictício.', status: i === 3 ? 'AVALIADA' : 'ENVIADA', enviadaEm: new Date(),
    } })
  }
  await prisma.redacao.create({ data: { alunoId: usuarios[3].id, temaId: outroTema.id, texto: 'Rascunho privado.' } })
})

after(async () => {
  try {
    if (confirmado) {
      if (turma) {
        await prisma.redacao.deleteMany({ where: { tema: { turmaId: turma.id } } })
        await prisma.temaRedacao.deleteMany({ where: { turmaId: turma.id } })
        await prisma.matricula.deleteMany({ where: { turmaId: turma.id } })
        await prisma.turma.delete({ where: { id: turma.id } })
      }
      await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } })
    }
  } finally {
    await prisma.$disconnect()
  }
})

function consultar({ temaId = tema.id, status, token = tokens[0] } = {}) {
  const chamada = request(app).get(`/api/turmas/${turma.id}/redacoes`).query({ temaId, ...(status && { status }) })
  return token ? chamada.set('Authorization', `Bearer ${token}`) : chamada
}

test('separa cinco entregas ativas e uma histórica sem apagar nenhuma redação', async () => {
  const resposta = await consultar().expect(200)
  assert.equal(resposta.body.data.redacoes.length, 6)
  assert.deepEqual(resposta.body.data.resumoEntregas, resumo(5, 5, 1))
  const antiga = resposta.body.data.redacoes.find(r => r.aluno.id === usuarios[2].id)
  assert.equal(antiga.aluno.matriculaAtivaNaTurma, false)
  assert.ok(resposta.body.data.redacoes.filter(r => r.aluno.id !== usuarios[2].id).every(r => r.aluno.matriculaAtivaNaTurma === true))
})

test('respeita tema e status sem contar rascunhos como entregas', async () => {
  const avaliada = await consultar({ status: 'AVALIADA' }).expect(200)
  assert.equal(avaliada.body.data.redacoes.length, 1)
  assert.deepEqual(avaliada.body.data.resumoEntregas, resumo(5, 1, 0))
  const semEnvios = await consultar({ temaId: outroTema.id }).expect(200)
  assert.deepEqual(semEnvios.body.data.redacoes, [])
  assert.deepEqual(semEnvios.body.data.resumoEntregas, resumo(5, 0, 0))
  assert.ok(!JSON.stringify(semEnvios.body).includes('Rascunho privado.'))
})

test('reentrada preserva o histórico e conta o mesmo aluno apenas uma vez', async () => {
  await prisma.matricula.create({ data: { turmaId: turma.id, alunoId: usuarios[2].id } })
  // Duplicação legada de matrícula ativa não pode aumentar o denominador.
  const duplicada = await prisma.matricula.create({ data: { turmaId: turma.id, alunoId: usuarios[3].id } })
  const resposta = await consultar().expect(200)
  assert.deepEqual(resposta.body.data.resumoEntregas, resumo(6, 6, 0))
  const detalhe = await request(app).get(`/api/turmas/${turma.id}`).set('Authorization', `Bearer ${tokens[0]}`).expect(200)
  assert.equal(detalhe.body.data.turma.quantidadeAlunosAtivos, 6)
  assert.equal(Object.hasOwn(detalhe.body.data.turma, 'matriculas'), false)
  assert.equal(await prisma.matricula.count({ where: { turmaId: turma.id, alunoId: usuarios[2].id } }), 2)
  assert.ok(await prisma.matricula.findUnique({ where: { id: duplicada.id } }))
})

test('resumo e lista usam a mesma fotografia mesmo com envio concorrente', async () => {
  const original = prisma.$transaction.bind(prisma)
  try {
    // Somente agenda SQL real entre as duas leituras da consulta, sem simular dados.
    prisma.$transaction = (callback, ...opcoes) => original(tx => callback(new Proxy(tx, {
      get(target, chave) {
        if (chave === 'turma') return {
          findFirst: async args => {
            const registro = await target.turma.findFirst(args)
            await prisma.redacao.update({
              where: { alunoId_temaId: { alunoId: usuarios[3].id, temaId: outroTema.id } },
              data: { status: 'ENVIADA', enviadaEm: new Date() },
            })
            return registro
          },
        }
        return Reflect.get(target, chave)
      },
    })), ...opcoes)
    const resposta = await consultar({ temaId: outroTema.id }).expect(200)
    assert.deepEqual(resposta.body.data.redacoes, [])
    assert.deepEqual(resposta.body.data.resumoEntregas, resumo(6, 0, 0))
  } finally {
    prisma.$transaction = original
    await prisma.redacao.update({
      where: { alunoId_temaId: { alunoId: usuarios[3].id, temaId: outroTema.id } },
      data: { status: 'RASCUNHO', enviadaEm: null },
    })
  }
})

test('turma arquivada mantém todas as entregas como histórico, sem denominador ativo', async () => {
  await request(app).post(`/api/turmas/${turma.id}/arquivar`).set('Authorization', `Bearer ${tokens[0]}`).expect(200)
  const resposta = await consultar().expect(200)
  assert.equal(resposta.body.data.redacoes.length, 6)
  assert.deepEqual(resposta.body.data.resumoEntregas, resumo(0, 0, 6))
  assert.ok(resposta.body.data.redacoes.every(r => r.aluno.matriculaAtivaNaTurma === false))
})

test('isolamento e autenticação impedem consultar contagens de outro professor', async () => {
  const outra = await consultar({ token: tokens[1] }).expect(404)
  assert.equal(outra.body.error.code, 'CLASS_NOT_FOUND')
  await consultar({ token: tokens[2] }).expect(403)
  await consultar({ token: null }).expect(401)
})
