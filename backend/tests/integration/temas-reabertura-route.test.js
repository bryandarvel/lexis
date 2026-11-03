import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { criarAccessToken } from '../../src/modules/auth/auth-token.service.js'
import { obterModeloCompetenciaDois } from '../../src/modules/temas/temas.competencia-dois.js'

const usuarios = []
const turmas = []
let confirmado = false
let tokens

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
  for (const papel of ['PROFESSOR', 'PROFESSOR', 'ALUNO']) {
    usuarios.push(await prisma.usuario.create({ data: {
      nome: 'Fixture reabertura de proposta', papel,
      email: `reabrir.69.${randomUUID()}@lexis.example.com`, senhaHash: 'fixture-sem-login',
    } }))
  }
  tokens = usuarios.map(u => criarAccessToken({ usuarioId: u.id, papel: u.papel }))
})

after(async () => {
  if (confirmado) {
    const ids = turmas.map(t => t.id)
    await prisma.redacao.deleteMany({ where: { tema: { turmaId: { in: ids } } } })
    await prisma.matricula.deleteMany({ where: { turmaId: { in: ids } } })
    await prisma.temaRedacao.deleteMany({ where: { turmaId: { in: ids } } })
    await prisma.turma.deleteMany({ where: { id: { in: ids } } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } })
  }
  await prisma.$disconnect()
})

async function criarProposta({ ativo = false, turmaAtiva = true, vencida = true } = {}) {
  const turma = await prisma.turma.create({ data: {
    nome: 'Turma fictícia da proposta', professorId: usuarios[0].id,
    codigoAcesso: randomUUID(), ativa: turmaAtiva, arquivadaEm: turmaAtiva ? null : new Date(),
  } })
  turmas.push(turma)
  const tema = await prisma.temaRedacao.create({ data: {
    turmaId: turma.id, enunciado: 'Desafios da educação midiática no Brasil',
    descricao: 'Proposta fictícia para teste de reabertura.', instrucoes: 'Use repertórios pertinentes.',
    ativo, arquivadoEm: ativo ? null : new Date(), criteriosBloqueadosEm: new Date('2020-01-01'),
    prazoEntrega: vencida ? new Date('2020-01-02') : new Date(Date.now() + 86400000),
    criterios: { create: obterModeloCompetenciaDois().criterios.map((c, i) => ({ ...c, ordem: i + 1 })) },
  }, include: { criterios: { orderBy: { ordem: 'asc' } } } })
  return { turma, tema }
}

function reabrir(id, token = tokens[0]) {
  const chamada = request(app).post(`/api/temas/${id}/reabrir`)
  return token ? chamada.set('Authorization', `Bearer ${token}`) : chamada
}

test('reabre proposta vencida sem alterar conteúdo, critérios ou prazo, e envio continua atrasado', async () => {
  const { turma, tema } = await criarProposta()
  await prisma.matricula.create({ data: { alunoId: usuarios[2].id, turmaId: turma.id } })
  const resposta = await reabrir(tema.id).expect(200)
  const reaberto = resposta.body.data.tema
  assert.equal(reaberto.ativo, true)
  assert.equal(reaberto.arquivadoEm, null)
  for (const campo of ['enunciado', 'descricao', 'instrucoes']) assert.equal(reaberto[campo], tema[campo])
  assert.equal(reaberto.prazoEntrega, tema.prazoEntrega.toISOString())
  assert.equal(reaberto.criteriosBloqueadosEm, tema.criteriosBloqueadosEm.toISOString())
  assert.equal(reaberto.criteriosBloqueados, true)
  const criterios = await prisma.criterioAvaliacao.findMany({ where: { temaId: tema.id }, orderBy: { ordem: 'asc' } })
  assert.deepEqual(criterios, tema.criterios)
  const lista = await request(app).get('/api/aluno/temas').set('Authorization', `Bearer ${tokens[2]}`).expect(200)
  assert.ok(lista.body.data.temas.some(t => t.id === tema.id))
  await request(app).put(`/api/aluno/temas/${tema.id}/redacao`)
    .set('Authorization', `Bearer ${tokens[2]}`).send({ texto: 'Texto fictício para testar envio após reabertura.' }).expect(200)
  const envio = await request(app).post(`/api/aluno/temas/${tema.id}/redacao/enviar`)
    .set('Authorization', `Bearer ${tokens[2]}`).expect(200)
  assert.equal(envio.body.data.redacao.enviadaComAtraso, true)
  assert.equal(envio.body.data.redacao.prazoConsideradoEm, tema.prazoEntrega.toISOString())
})

test('reabre proposta com prazo futuro preservando o prazo', async () => {
  const { tema } = await criarProposta({ vencida: false })
  const resposta = await reabrir(tema.id).expect(200)
  assert.equal(resposta.body.data.tema.prazoEntrega, tema.prazoEntrega.toISOString())
})

test('proposta ativa gera conflito sem ser alterada', async () => {
  const { tema } = await criarProposta({ ativo: true })
  const resposta = await reabrir(tema.id).expect(409)
  assert.equal(resposta.body.error.code, 'ESSAY_TOPIC_ALREADY_ACTIVE')
  const { criterios: _criterios, ...antes } = tema
  assert.deepEqual(await prisma.temaRedacao.findUnique({ where: { id: tema.id } }), antes)
})

test('exige reabrir a turma antes da proposta', async () => {
  const { tema } = await criarProposta({ turmaAtiva: false })
  const resposta = await reabrir(tema.id).expect(409)
  assert.equal(resposta.body.error.code, 'CLASS_ARCHIVED')
  assert.equal((await prisma.temaRedacao.findUnique({ where: { id: tema.id } })).ativo, false)
})

test('autorização, isolamento e UUID impedem reabertura indevida', async () => {
  const { tema } = await criarProposta()
  await reabrir(tema.id, null).expect(401)
  await reabrir(tema.id, tokens[2]).expect(403)
  await reabrir('id-invalido').expect(422)
  const alheia = await reabrir(tema.id, tokens[1]).expect(404)
  const ausente = await reabrir(randomUUID(), tokens[1]).expect(404)
  assert.deepEqual(alheia.body, ausente.body)
  assert.equal(alheia.body.error.code, 'ESSAY_TOPIC_NOT_FOUND')
  assert.equal((await prisma.temaRedacao.findUnique({ where: { id: tema.id } })).ativo, false)
})

test('duas reaberturas simultâneas geram um sucesso e um conflito', async () => {
  const { tema } = await criarProposta()
  const respostas = await Promise.all([reabrir(tema.id), reabrir(tema.id)])
  assert.deepEqual(respostas.map(r => r.status).sort(), [200, 409])
  assert.equal(respostas.find(r => r.status === 409).body.error.code, 'ESSAY_TOPIC_ALREADY_ACTIVE')
})

test('arquivamento que vence a corrida é observado antes de reabrir a proposta', async () => {
  const { turma, tema } = await criarProposta()
  const original = prisma.$transaction.bind(prisma)
  let liberarArquivo, sinalizarBloqueio, sinalizarTentativa
  const arquivoPodeConcluir = new Promise(resolve => { liberarArquivo = resolve })
  const arquivoBloqueou = new Promise(resolve => { sinalizarBloqueio = resolve })
  const reaberturaTentou = new Promise(resolve => { sinalizarTentativa = resolve })
  let arquivo, reabertura
  let temporizador
  const limite = new Promise((_, reject) => {
    temporizador = setTimeout(() => reject(new Error('A reabertura não tentou obter o bloqueio da turma.')), 5000)
  })
  try {
    // SQL real segura o bloqueio; a instrumentação abaixo só coordena a ordem,
    // sem substituir consultas ou resultados do MySQL.
    arquivo = original(async tx => {
      await tx.turma.update({ where: { id: turma.id }, data: { ativa: false, arquivadaEm: new Date() } })
      sinalizarBloqueio()
      await arquivoPodeConcluir
    })
    await arquivoBloqueou
    prisma.$transaction = (callback, ...opcoes) => original(tx => callback(new Proxy(tx, {
      get(target, chave) {
        if (chave === '$queryRaw') {
          return (...args) => {
            sinalizarTentativa()
            return target.$queryRaw(...args)
          }
        }
        return Reflect.get(target, chave)
      },
    })), ...opcoes)
    reabertura = reabrir(tema.id).then(resposta => resposta)
    await Promise.race([reaberturaTentou, limite])
    liberarArquivo()
    await arquivo
    const resposta = await reabertura
    assert.equal(resposta.status, 409)
    assert.equal(resposta.body.error.code, 'CLASS_ARCHIVED')
    assert.equal((await prisma.temaRedacao.findUnique({ where: { id: tema.id } })).ativo, false)
  } finally {
    liberarArquivo()
    clearTimeout(temporizador)
    await Promise.allSettled([arquivo, reabertura].filter(Boolean))
    prisma.$transaction = original
  }
})
