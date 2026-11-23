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
import { processarFilaRecuperacao } from '../../src/modules/auth/password-recovery.service.js'

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
const solicitar = (sessao, dados = { senhaAtual: senha }) => request(app)
  .post('/api/auth/alterar-senha').set(auth(sessao)).send(dados)
const definir = (token, nova = novaSenha) => request(app)
  .post('/api/auth/redefinir-senha').send({ token, senha: nova })

for (const papel of ['ALUNO', 'PROFESSOR']) {
  test(`${papel} confirma a senha antes de mudar o próprio nome`, async () => {
    const { usuario, sessao } = await criarConta(papel)
    const alterar = dados => request(app).patch('/api/auth/me').set(auth(sessao)).send(dados)
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })
    await alterar({ nome: 'Nome sem senha' }).expect(422)
    const erro = await alterar({ nome: 'Nome com senha incorreta', senhaAtual: 'incorreta' }).expect(422)
    assert.equal(erro.body.error.code, 'CURRENT_PASSWORD_INVALID')
    assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
    const resposta = await alterar({ nome: '  Novo   Nome Fictício  ', senhaAtual: senha }).expect(200)
    const publico = resposta.body.data.usuario
    assert.equal(publico.id, usuario.id)
    assert.equal(publico.nome, 'Novo Nome Fictício')
    assert.equal(publico.email, usuario.email)
    assert.equal(publico.papel, papel)
    assert.equal(Object.hasOwn(publico, 'senhaHash'), false)
    assert.equal(Object.hasOwn(publico, 'sessaoVersao'), false)
    await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)
  })

  test(`${papel} só muda a senha com link entregue por e-mail`, async t => {
    t.mock.method(globalThis, 'fetch', async () => assert.fail('Não deve chamar o provedor sem substituto'))
    const habilitado = env.EMAIL_ENABLED
    env.EMAIL_ENABLED = true
    t.after(() => { env.EMAIL_ENABLED = habilitado })
    const { usuario, sessao } = await criarConta(papel)
    const outra = await autenticarUsuario({ email: usuario.email, senha })
    const antes = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })

    const incorreta = await solicitar(sessao, { senhaAtual: 'SenhaIncorreta123' }).expect(422)
    assert.equal(incorreta.body.error.code, 'CURRENT_PASSWORD_INVALID')
    await solicitar(sessao, { senhaAtual: senha, novaSenha }).expect(422)
    assert.equal(await prisma.recuperacaoSenha.count({ where: { usuarioId: usuario.id } }), 0)
    const pedido = await solicitar(sessao).expect(202)
    assert.deepEqual(Object.keys(pedido.body.data), ['mensagem'])
    assert.equal(pedido.headers['set-cookie'], undefined)
    assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
    await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)

    let link
    const fila = await processarFilaRecuperacao({ limite: 1 }, {
      habilitado: true, ambiente: 'production',
      enviar: async mensagem => {
        assert.equal(mensagem.destinatario, usuario.email)
        link = new URL(mensagem.texto.match(/https?:\/\/\S+/u)[0])
      },
    })
    assert.equal(fila.enviados, 1)
    assert.equal(link.pathname, '/redefinir-senha')
    const token = new URLSearchParams(link.hash.slice(1)).get('token')
    assert.match(token, /^[a-f0-9]{64}$/)
    const resposta = await definir(token).expect(204)
    assert.match(resposta.headers['set-cookie'][0], /^lexis_refresh_token=;/)
    for (const antiga of [sessao, outra]) {
      await request(app).get('/api/auth/me').set(auth(antiga)).expect(401)
      await request(app).post('/api/auth/refresh').set('Cookie', `lexis_refresh_token=${antiga.refreshToken}`).expect(401)
    }
    await definir(token, 'OutraSenhaFicticia789!').expect(422)
    await assert.rejects(autenticarUsuario({ email: usuario.email, senha }), { code: 'INVALID_CREDENTIALS' })
    const login = await autenticarUsuario({ email: usuario.email, senha: novaSenha })
    assert.equal(login.usuario.id, usuario.id)
  })
}

test('perfil recusa nome inválido e campos fora do contrato sem alterar a conta', async () => {
  const { usuario, sessao } = await criarConta()
  const antes = await prisma.usuario.findUnique({ where: { id: usuario.id } })
  for (const body of [{}, { nome: 'a' }, { nome: 'a'.repeat(121) }, { nome: null },
    { nome: 'Nome válido', email: 'outro@lexis.example.com' }, { nome: 'Nome válido', papel: 'PROFESSOR' },
    { nome: 'Nome válido', usuarioId: randomUUID() }, { nome: 'Nome válido', sessaoVersao: 9 }]) {
    const resposta = await request(app).patch('/api/auth/me').set(auth(sessao)).send({ ...body, senhaAtual: senha }).expect(422)
    assert.equal(resposta.body.error.code, 'VALIDATION_ERROR')
    assert.ok(Array.isArray(resposta.body.error.details))
  }
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
})

test('senha fraca, bytes excedidos e corpo legado não revogam sessões', async () => {
  const { usuario, sessao } = await criarConta()
  const antes = await prisma.usuario.findUnique({ where: { id: usuario.id } })
  const token = randomBytes(32).toString('hex')
  await prisma.recuperacaoSenha.create({ data: {
    usuarioId: usuario.id, tokenHash: criarHashToken(token), statusEmail: 'ENVIADO', expiraEm: new Date(Date.now() + 600000),
  } })
  await definir(token, 'fraca').expect(422)
  await definir(token, 'Aa1' + 'é'.repeat(35)).expect(422)
  await solicitar(sessao, { senhaAtual: senha, novaSenha }).expect(422)
  await solicitar(sessao, { senhaAtual: senha, usuarioId: randomUUID() }).expect(422)
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
  assert.equal((await prisma.refreshToken.findUnique({ where: { tokenHash: criarHashToken(sessao.refreshToken) } })).revogadoEm, null)
  await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)
})

test('operações iniciadas com versão antiga não criam refresh nem alteram nome após a redefinição', async () => {
  const { usuario } = await criarConta()
  const token = randomBytes(32).toString('hex')
  await prisma.recuperacaoSenha.create({ data: {
    usuarioId: usuario.id, tokenHash: criarHashToken(token), statusEmail: 'ENVIADO', expiraEm: new Date(Date.now() + 600000),
  } })
  await definir(token).expect(204)
  const dados = { usuarioId: usuario.id, familiaId: randomUUID(), expiraEm: new Date(Date.now() + 100000), sessaoVersao: 0 }
  assert.equal(await salvarRefreshToken({ ...dados, tokenHash: randomBytes(32).toString('hex') }), null)
  assert.equal(await rotacionarRefreshToken({ ...dados, tokenAtualId: randomUUID(), novoTokenHash: randomBytes(32).toString('hex') }), false)
  await assert.rejects(atualizarPerfilUsuario({ ...dados, nome: 'Alteração antiga proibida', senhaAtual: senha }), { code: 'AUTHENTICATION_REQUIRED' })
  assert.equal((await prisma.usuario.findUnique({ where: { id: usuario.id } })).nome, usuario.nome)
})

test('autenticação é obrigatória e conta inativa não altera perfil ou solicita senha', async () => {
  await request(app).patch('/api/auth/me').send({ nome: 'Nome fictício', senhaAtual: senha }).expect(401)
  await request(app).post('/api/auth/alterar-senha').send({ senhaAtual: senha }).expect(401)
  const { usuario, sessao } = await criarConta()
  await prisma.usuario.update({ where: { id: usuario.id }, data: { ativo: false } })
  await request(app).patch('/api/auth/me').set(auth(sessao)).send({ nome: 'Nome proibido', senhaAtual: senha }).expect(401)
  await solicitar(sessao).expect(401)
})

test('solicitação de senha limita dez tentativas por usuário', async () => {
  const { sessao } = await criarConta()
  for (let i = 0; i < 10; i += 1) await solicitar(sessao, { senhaAtual: 'SenhaErrada123' }).expect(422)
  const resposta = await solicitar(sessao).expect(429)
  assert.equal(resposta.body.error.code, 'RATE_LIMIT_EXCEEDED')
  await request(app).get('/api/auth/me').set(auth(sessao)).expect(200)
})
