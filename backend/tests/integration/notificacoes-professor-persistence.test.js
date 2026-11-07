import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { criarAccessToken } from '../../src/modules/auth/auth-token.service.js'
import { reservarProximaNotificacaoEmail } from '../../src/modules/notificacoes/notificacoes-email.repository.js'

const usuarios = []
const temas = []
let turma, tokens, notificacao, versaoFeedback
let confirmado = false

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
  for (const papel of ['PROFESSOR', 'PROFESSOR', 'ALUNO']) {
    usuarios.push(await prisma.usuario.create({ data: {
      nome: 'Fixture notificações do professor', papel,
      email: `notificacao.72.${randomUUID()}@lexis.example.com`, senhaHash: 'fixture-sem-login',
    } }))
  }
  tokens = usuarios.map(u => criarAccessToken({ usuarioId: u.id, papel: u.papel }))
  turma = await prisma.turma.create({ data: {
    professorId: usuarios[0].id, nome: 'Turma fictícia 72', codigoAcesso: randomUUID(),
  } })
  await prisma.matricula.create({ data: { turmaId: turma.id, alunoId: usuarios[2].id } })
})

after(async () => {
  if (confirmado) {
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: usuarios.map(u => u.id) } } })
    if (turma) {
      await prisma.feedbackVersao.deleteMany({ where: { professorId: { in: usuarios.map(u => u.id) } } })
      await prisma.feedback.deleteMany({ where: { redacao: { tema: { turmaId: turma.id } } } })
      await prisma.redacao.deleteMany({ where: { tema: { turmaId: turma.id } } })
      await prisma.temaRedacao.deleteMany({ where: { turmaId: turma.id } })
      await prisma.matricula.deleteMany({ where: { turmaId: turma.id } })
      await prisma.turma.delete({ where: { id: turma.id } })
    }
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } })
  }
  await prisma.$disconnect()
})

async function criarRascunho() {
  const tema = await prisma.temaRedacao.create({ data: {
    turmaId: turma.id, enunciado: 'Proposta fictícia para avisos', descricao: 'Dados somente de teste.',
    prazoEntrega: new Date(Date.now() + 86400000),
  } })
  temas.push(tema)
  await request(app).put(`/api/aluno/temas/${tema.id}/redacao`)
    .set('Authorization', `Bearer ${tokens[2]}`).send({ texto: 'Texto fictício que não deve aparecer nos avisos.' }).expect(200)
  return tema
}

const auth = token => ({ Authorization: `Bearer ${token}` })
const enviar = tema => request(app).post(`/api/aluno/temas/${tema.id}/redacao/enviar`).set(auth(tokens[2]))
const listar = token => request(app).get('/api/professor/notificacoes').set(auth(token))
const ler = (id, token = tokens[0]) => request(app).patch(`/api/professor/notificacoes/${id}/lida`).set(auth(token))

test('envio concorrente cria um único aviso transacional só para o professor responsável', async () => {
  const tema = await criarRascunho()
  const respostas = await Promise.all([enviar(tema), enviar(tema)])
  assert.deepEqual(respostas.map(r => r.status).sort(), [200, 409])
  const redacao = respostas.find(r => r.status === 200).body.data.redacao
  const registros = await prisma.notificacao.findMany({ where: { redacaoId: redacao.id } })
  assert.equal(registros.length, 1)
  notificacao = registros[0]
  assert.equal(notificacao.usuarioId, usuarios[0].id)
  assert.equal(notificacao.tipo, 'REDACAO_ENVIADA')
  assert.equal(notificacao.feedbackVersaoId, null)
  assert.equal(notificacao.emailDestino, null)
  assert.equal(notificacao.statusEmail, null)
  const minha = await listar(tokens[0]).expect(200)
  assert.equal(minha.body.data.totalNaoLidas, 1)
  const aviso = minha.body.data.notificacoes[0]
  assert.equal(aviso.redacaoId, redacao.id)
  assert.equal(aviso.redacao.tema.id, tema.id)
  assert.equal(aviso.redacao.tema.enunciado, tema.enunciado)
  assert.equal(aviso.redacao.tema.turma.id, turma.id)
  assert.ok(!JSON.stringify(minha.body).includes('Texto fictício que não deve aparecer'))
  assert.equal(Object.hasOwn(aviso.redacao, 'texto'), false)
  const alheia = await listar(tokens[1]).expect(200)
  assert.deepEqual(alheia.body.data, { notificacoes: [], totalNaoLidas: 0 })
})

test('leitura concorrente é idempotente e não pode ser feita por outro usuário', async () => {
  const alheia = await ler(notificacao.id, tokens[1]).expect(404)
  const ausente = await ler(randomUUID(), tokens[1]).expect(404)
  assert.deepEqual(alheia.body, ausente.body)
  assert.equal(alheia.body.error.code, 'NOTIFICATION_NOT_FOUND')
  assert.equal((await prisma.notificacao.findUnique({ where: { id: notificacao.id } })).lidaEm, null)
  const respostas = await Promise.all([ler(notificacao.id), ler(notificacao.id)])
  assert.deepEqual(respostas.map(r => r.status), [200, 200])
  const data = respostas[0].body.data.notificacao.lidaEm
  assert.ok(data)
  assert.equal(respostas[1].body.data.notificacao.lidaEm, data)
  assert.equal((await ler(notificacao.id).expect(200)).body.data.notificacao.lidaEm, data)
  assert.equal((await listar(tokens[0]).expect(200)).body.data.totalNaoLidas, 0)
})

test('endpoints do professor exigem autenticação, papel e UUID válido', async () => {
  await request(app).get('/api/professor/notificacoes').expect(401)
  await request(app).patch(`/api/professor/notificacoes/${randomUUID()}/lida`).expect(401)
  await listar(tokens[2]).expect(403)
  await ler(notificacao.id, tokens[2]).expect(403)
  await ler('id-invalido').expect(422)
  await request(app).get('/api/aluno/notificacoes').set(auth(tokens[0])).expect(403)
})

test('falha ao criar aviso reverte envio e bloqueio do tema na mesma transação', async () => {
  const tema = await criarRascunho()
  const original = prisma.$transaction.bind(prisma)
  try {
    prisma.$transaction = (callback, ...opcoes) => original(tx => callback(new Proxy(tx, {
      get(target, chave) {
        if (chave === 'notificacao') return { create: async () => { throw new Error('Falha sintética de persistência do aviso') } }
        return Reflect.get(target, chave)
      },
    })), ...opcoes)
    await enviar(tema).expect(500)
  } finally {
    prisma.$transaction = original
  }
  const redacao = await prisma.redacao.findUnique({ where: { alunoId_temaId: { alunoId: usuarios[2].id, temaId: tema.id } } })
  assert.equal(redacao.status, 'RASCUNHO')
  assert.equal(redacao.enviadaEm, null)
  assert.equal((await prisma.temaRedacao.findUnique({ where: { id: tema.id } })).criteriosBloqueadosEm, null)
  assert.equal(await prisma.notificacao.count({ where: { redacaoId: redacao.id } }), 0)
  await enviar(tema).expect(200)
})

test('avisos internos nunca são reservados para e-mail, mesmo com status pendente indevido', async () => {
  const feedback = await prisma.feedback.create({ data: { redacaoId: notificacao.redacaoId } })
  versaoFeedback = await prisma.feedbackVersao.create({ data: {
    feedbackId: feedback.id, professorId: usuarios[0].id, numero: 1, status: 'PUBLICADA', publicadoEm: new Date(), nota: 800,
  } })
  const ids = []
  for (const tipo of ['REDACAO_ENVIADA', 'MATRICULA_ENCERRADA', 'TURMA_ARQUIVADA', 'ALUNO_SAIU_TURMA']) {
    const item = await prisma.notificacao.create({ data: {
      usuarioId: usuarios[1].id, tipo, titulo: 'Evento fictício interno', mensagem: 'Somente teste.',
      emailDestino: usuarios[1].email, statusEmail: 'PENDENTE',
      // Mesmo um vínculo preenchido indevidamente não autoriza e-mail de outro tipo.
      feedbackVersaoId: versaoFeedback.id,
    } })
    ids.push(item.id)
  }
  const cliente = {
    notificacao: {
      findFirst: args => prisma.notificacao.findFirst({ ...args, where: { AND: [args.where, { id: { in: ids } }] } }),
      updateMany: () => { throw new Error('Não deve reservar evento interno') },
    },
  }
  assert.equal(await reservarProximaNotificacaoEmail({ agora: new Date(), maxTentativas: 3 }, cliente), null)
  const itens = await prisma.notificacao.findMany({ where: { id: { in: ids } } })
  assert.ok(itens.every(i => i.tentativasEmail === 0 && i.statusEmail === 'PENDENTE'))
})

test('contrato do aluno mantém feedback, leitura e isolamento', async () => {
  const redacao = await prisma.redacao.findUnique({ where: { id: notificacao.redacaoId } })
  const aviso = await prisma.notificacao.create({ data: {
    usuarioId: usuarios[2].id, feedbackVersaoId: versaoFeedback.id, tipo: 'FEEDBACK_PUBLICADO',
    titulo: 'Correção fictícia disponível', mensagem: 'Consulte sua correção.', emailDestino: usuarios[2].email,
  } })
  const lista = await request(app).get('/api/aluno/notificacoes').set(auth(tokens[2])).expect(200)
  assert.equal(lista.body.data.notificacoes[0].feedbackVersao.feedback.redacaoId, redacao.id)
  assert.equal(lista.body.data.notificacoes[0].feedbackVersao.numero, 1)
  assert.equal(lista.body.data.totalNaoLidas, 1)
  await request(app).patch(`/api/aluno/notificacoes/${aviso.id}/lida`).set(auth(tokens[2])).expect(200)
  await request(app).patch(`/api/aluno/notificacoes/${notificacao.id}/lida`).set(auth(tokens[2])).expect(404)
  assert.equal((await request(app).get('/api/aluno/notificacoes').set(auth(tokens[2])).expect(200)).body.data.totalNaoLidas, 0)
})
