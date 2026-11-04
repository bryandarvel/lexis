import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { autenticarUsuario, cadastrarUsuario, atualizarPerfilUsuario } from '../../src/modules/auth/auth.service.js'
import { criarHashToken } from '../../src/modules/auth/auth-token.service.js'
import { salvarRefreshToken, rotacionarRefreshToken } from '../../src/modules/auth/auth.repository.js'

const usuarios = []
const senha = 'SenhaFicticiaAtual123!'
const novaSenha = 'NovaSenhaFicticia456!'
let confirmado = false

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
})
after(async () => {
  if (confirmado) await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } })
  await prisma.$disconnect()
})

async function criarConta(papel = 'ALUNO') {
  const usuario = await cadastrarUsuario({
    nome: 'Pessoa Fictícia', email: `perfil.71.${randomUUID()}@lexis.example.com`, senha, papel,
  })
  usuarios.push(usuario)
  return { usuario, sessao: await autenticarUsuario({ email: usuario.email, senha }) }
}
const auth = sessao => ({ Authorization: `Bearer ${sessao.accessToken}` })
const trocar = (sessao, dados = { senhaAtual: senha, novaSenha }) => request(app)
  .post('/api/auth/alterar-senha').set(auth(sessao)).send(dados)
const cookieDe = resposta => resposta.headers['set-cookie'].find(c => c.startsWith('lexis_refresh_token=')).split(';')[0]

for (const papel of ['ALUNO', 'PROFESSOR']) {
  test(`${papel} altera somente o próprio nome, com normalização e projeção pública`, async () => {
    const { usuario, sessao } = await criarConta(papel)
    const resposta = await request(app).patch('/api/auth/me').set(auth(sessao)).send({ nome: '  Novo   Nome Fictício  ' }).expect(200)
    assert.equal(resposta.body.data.usuario.nome, 'Novo Nome Fictício')
    assert.equal(resposta.body.data.usuario.id, usuario.id)
    assert.equal(resposta.body.data.usuario.email, usuario.email)
    assert.equal(resposta.body.data.usuario.papel, papel)
    assert.equal(Object.hasOwn(resposta.body.data.usuario, 'senhaHash'), false)
    assert.equal(Object.hasOwn(resposta.body.data.usuario, 'sessaoVersao'), false)
    const atual = await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)
    assert.equal(atual.body.data.usuario.nome, 'Novo Nome Fictício')
  })

  test(`${papel} troca senha, revoga access/refresh antigos e mantém a nova sessão`, async () => {
    const { usuario, sessao } = await criarConta(papel)
    const outra = await autenticarUsuario({ email: usuario.email, senha })
    const tokenReset = randomBytes(32).toString('hex')
    const recuperacao = await prisma.recuperacaoSenha.create({ data: {
      usuarioId: usuario.id, tokenHash: criarHashToken(tokenReset), statusEmail: 'ENVIADO', expiraEm: new Date(Date.now() + 600000),
    } })
    const resposta = await trocar(sessao).expect(200)
    assert.deepEqual(Object.keys(resposta.body.data).sort(), ['accessToken', 'usuario'])
    assert.ok(resposta.headers['set-cookie'][0].includes('HttpOnly'))
    assert.ok(resposta.headers['set-cookie'][0].includes('SameSite=Lax'))
    assert.ok(resposta.headers['set-cookie'][0].includes('Path=/api/auth'))
    assert.equal(Object.hasOwn(resposta.body.data.usuario, 'senhaHash'), false)
    for (const antiga of [sessao, outra]) {
      await request(app).get('/api/auth/me').set(auth(antiga)).expect(401)
      await request(app).post('/api/auth/refresh').set('Cookie', `lexis_refresh_token=${antiga.refreshToken}`).expect(401)
    }
    await request(app).get('/api/auth/me').set(auth(resposta.body.data)).expect(200)
    await request(app).patch('/api/auth/me').set(auth(resposta.body.data)).send({ nome: 'Nome após troca' }).expect(200)
    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookieDe(resposta)).expect(200)
    await request(app).get('/api/auth/me').set(auth(refresh.body.data)).expect(200)
    await assert.rejects(autenticarUsuario({ email: usuario.email, senha }), { code: 'INVALID_CREDENTIALS' })
    const login = await autenticarUsuario({ email: usuario.email, senha: novaSenha })
    assert.equal(login.usuario.id, usuario.id)
    assert.ok((await prisma.recuperacaoSenha.findUnique({ where: { id: recuperacao.id } })).consumidoEm)
    await request(app).post('/api/auth/redefinir-senha').send({ token: tokenReset, senha: 'OutraSenhaFicticia789!' }).expect(422)
    assert.equal((await prisma.usuario.findUnique({ where: { id: usuario.id } })).sessaoVersao, 1)
  })
}

test('perfil recusa nome inválido e campos fora do contrato sem alterar a conta', async () => {
  const { usuario, sessao } = await criarConta()
  const antes = await prisma.usuario.findUnique({ where: { id: usuario.id } })
  for (const body of [{}, { nome: 'a' }, { nome: 'a'.repeat(121) }, { nome: null },
    { nome: 'Nome válido', email: 'outro@lexis.example.com' }, { nome: 'Nome válido', papel: 'PROFESSOR' },
    { nome: 'Nome válido', usuarioId: randomUUID() }, { nome: 'Nome válido', sessaoVersao: 9 }]) {
    const resposta = await request(app).patch('/api/auth/me').set(auth(sessao)).send(body).expect(422)
    assert.equal(resposta.body.error.code, 'VALIDATION_ERROR')
    assert.ok(Array.isArray(resposta.body.error.details))
  }
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
})

test('senha atual incorreta, senha fraca, bytes excedidos e campos extras não revogam sessões', async () => {
  const { usuario, sessao } = await criarConta()
  const antes = await prisma.usuario.findUnique({ where: { id: usuario.id } })
  const incorreta = await trocar(sessao, { senhaAtual: 'SenhaIncorreta123', novaSenha }).expect(422)
  assert.equal(incorreta.body.error.code, 'CURRENT_PASSWORD_INVALID')
  assert.equal(incorreta.body.error.details[0].field, 'senhaAtual')
  for (const body of [{ senhaAtual: senha, novaSenha: 'fraca' },
    { senhaAtual: senha, novaSenha: 'Aa1' + 'é'.repeat(35) },
    { senhaAtual: senha, novaSenha, usuarioId: randomUUID() }]) {
    const resposta = await trocar(sessao, body).expect(422)
    assert.equal(resposta.body.error.code, 'VALIDATION_ERROR')
  }
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
  const refresh = await prisma.refreshToken.findUnique({ where: { tokenHash: criarHashToken(sessao.refreshToken) } })
  assert.equal(refresh.revogadoEm, null)
  await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)
})

test('duas trocas concorrentes têm um vencedor e não sobrescrevem a senha aceita', async () => {
  const { usuario, sessao } = await criarConta()
  const senhas = ['SenhaConcorrenteUma123', 'SenhaConcorrenteDuas123']
  const respostas = await Promise.all(senhas.map(nova => trocar(sessao, { senhaAtual: senha, novaSenha: nova })))
  assert.deepEqual(respostas.map(r => r.status).sort(), [200, 401])
  const indice = respostas.findIndex(r => r.status === 200)
  assert.ok(await autenticarUsuario({ email: usuario.email, senha: senhas[indice] }))
  await assert.rejects(autenticarUsuario({ email: usuario.email, senha: senhas[1 - indice] }), { code: 'INVALID_CREDENTIALS' })
  assert.equal((await prisma.usuario.findUnique({ where: { id: usuario.id } })).sessaoVersao, 1)
})

test('falha ao persistir nova sessão reverte senha e revogações', async () => {
  const { usuario, sessao } = await criarConta()
  const antes = await prisma.usuario.findUnique({ where: { id: usuario.id } })
  const original = prisma.$transaction.bind(prisma)
  try {
    prisma.$transaction = (callback, ...opcoes) => original(tx => callback(new Proxy(tx, {
      get(target, chave) {
        if (chave === 'refreshToken') return {
          updateMany: args => target.refreshToken.updateMany(args),
          create: async () => { throw new Error('Falha sintética ao salvar nova sessão') },
        }
        return Reflect.get(target, chave)
      },
    })), ...opcoes)
    await trocar(sessao).expect(500)
  } finally {
    prisma.$transaction = original
  }
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
  assert.equal((await prisma.refreshToken.findUnique({ where: { tokenHash: criarHashToken(sessao.refreshToken) } })).revogadoEm, null)
  await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)
})

test('operações iniciadas com versão antiga não criam refresh nem alteram nome após a troca', async () => {
  const { usuario, sessao } = await criarConta()
  await trocar(sessao).expect(200)
  const dados = { usuarioId: usuario.id, familiaId: randomUUID(), expiraEm: new Date(Date.now() + 100000), sessaoVersao: 0 }
  assert.equal(await salvarRefreshToken({ ...dados, tokenHash: randomBytes(32).toString('hex') }), null)
  assert.equal(await rotacionarRefreshToken({ ...dados, tokenAtualId: randomUUID(), novoTokenHash: randomBytes(32).toString('hex') }), false)
  await assert.rejects(atualizarPerfilUsuario({ usuarioId: usuario.id, sessaoVersao: 0, nome: 'Alteração antiga proibida' }), { code: 'AUTHENTICATION_REQUIRED' })
  assert.equal((await prisma.usuario.findUnique({ where: { id: usuario.id } })).nome, usuario.nome)
})

test('autenticação é obrigatória e conta inativa não altera perfil ou senha', async () => {
  await request(app).patch('/api/auth/me').send({ nome: 'Nome fictício' }).expect(401)
  await request(app).post('/api/auth/alterar-senha').send({ senhaAtual: senha, novaSenha }).expect(401)
  const { usuario, sessao } = await criarConta()
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } })
  await request(app).patch('/api/auth/me').set(auth(sessao)).send({ nome: 'Nome proibido' }).expect(401)
  await trocar(sessao).expect(401)
})

test('troca de senha limita dez tentativas por usuário, com erro controlado na seguinte', async () => {
  const { sessao } = await criarConta()
  for (let i = 0; i < 10; i += 1) await trocar(sessao, { senhaAtual: 'SenhaErrada123', novaSenha }).expect(422)
  const resposta = await trocar(sessao, { senhaAtual: senha, novaSenha }).expect(429)
  assert.equal(resposta.body.error.code, 'RATE_LIMIT_EXCEEDED')
  await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)
})
