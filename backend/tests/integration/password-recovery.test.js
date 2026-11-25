import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'

process.env.EMAIL_ENABLED = 'true'
const { app } = await import('../../src/app.js')
const { prisma } = await import('../../src/config/prisma.js')
const { cadastrarUsuario, autenticarUsuario, renovarSessao } = await import('../../src/modules/auth/auth.service.js')
const { criarHashToken } = await import('../../src/modules/auth/auth-token.service.js')
const { processarFilaRecuperacao } = await import('../../src/modules/auth/password-recovery.service.js')
const { salvarRefreshToken, rotacionarRefreshToken } = await import('../../src/modules/auth/auth.repository.js')

let usuario
const senhaInicial = 'SenhaInicial123'
let senhaAtual = senhaInicial

before(async () => {
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  usuario = await cadastrarUsuario({ nome: 'Recuperação Fictícia', email: `teste.reset.${randomUUID()}@lexis.example.com`, senha: senhaInicial, papel: 'PROFESSOR' })
})
after(async () => {
  if (usuario) await prisma.usuario.delete({ where: { id: usuario.id } })
  await prisma.$disconnect()
})

async function tokenDeTeste({ expiraEm = new Date(Date.now() + 600000), consumidoEm = null } = {}) {
  const token = randomBytes(32).toString('hex')
  await prisma.recuperacaoSenha.create({ data: { usuarioId: usuario.id, tokenHash: criarHashToken(token), expiraEm, consumidoEm, statusEmail: 'ENVIADO' } })
  return token
}

test('solicitação não revela existência da conta nem token; aplica cooldown', async () => {
  const existente = await request(app).post('/api/auth/recuperar-senha').send({ email: usuario.email }).expect(202)
  const ausente = await request(app).post('/api/auth/recuperar-senha').send({ email: 'ausente@lexis.example.com' }).expect(202)
  assert.deepEqual(existente.body, ausente.body)
  assert.deepEqual(Object.keys(existente.body.data), ['mensagem'])
  await request(app).post('/api/auth/recuperar-senha').send({ email: usuario.email }).expect(202)
  assert.equal(await prisma.recuperacaoSenha.count({ where: { usuarioId: usuario.id } }), 1)
  const registro = await prisma.recuperacaoSenha.findFirst({ where: { usuarioId: usuario.id } })
  assert.equal(registro.tokenHash, null)
  assert.equal(registro.statusEmail, 'PENDENTE')
})

test('token inválido, expirado, usado e senha fraca não modificam a conta', async () => {
  const antes = await prisma.usuario.findUnique({ where: { id: usuario.id } })
  const tokens = [randomBytes(32).toString('hex'), await tokenDeTeste({ expiraEm: new Date(Date.now() - 1000) }), await tokenDeTeste({ consumidoEm: new Date() })]
  for (const token of tokens) {
    const resposta = await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'NovaSenha12345' }).expect(422)
    assert.equal(resposta.body.error.code, 'PASSWORD_RESET_INVALID')
  }
  const token = await tokenDeTeste()
  await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'fraca' }).expect(422)
  const depois = await prisma.usuario.findUnique({ where: { id: usuario.id } })
  assert.equal(depois.senhaHash, antes.senhaHash)
  assert.equal(depois.sessaoVersao, antes.sessaoVersao)
})

test('redefinição concorrente tem um vencedor e revoga access, refresh e outros links', async () => {
  const sessao = await autenticarUsuario({ email: usuario.email, senha: senhaAtual })
  const token = await tokenDeTeste()
  const outroToken = await tokenDeTeste()
  const respostas = await Promise.all(['NovaSenhaUma123', 'NovaSenhaDuas123'].map(senha => request(app).post('/api/auth/redefinir-senha').send({ token, senha })))
  assert.deepEqual(respostas.map(r => r.status).sort(), [204, 422])
  senhaAtual = respostas[0].status === 204 ? 'NovaSenhaUma123' : 'NovaSenhaDuas123'
  await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'SenhaReutilizada123' }).expect(422)
  await request(app).post('/api/auth/redefinir-senha').send({ token: outroToken, senha: 'SenhaReutilizada123' }).expect(422)
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sessao.accessToken}`).expect(401)
  await assert.rejects(renovarSessao(sessao.refreshToken), error => error.statusCode === 401)
  await assert.rejects(autenticarUsuario({ email: usuario.email, senha: senhaInicial }), { code: 'INVALID_CREDENTIALS' })
  const nova = await autenticarUsuario({ email: usuario.email, senha: senhaAtual })
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${nova.accessToken}`).expect(200)
  assert.ok(respostas.find(r => r.status === 204).headers['set-cookie'])
})

test('login e refresh iniciados antes do reset não criam sessão após mudança de versão', async () => {
  const hash = randomBytes(32).toString('hex')
  assert.equal(await salvarRefreshToken({ usuarioId: usuario.id, familiaId: randomUUID(), tokenHash: hash, expiraEm: new Date(Date.now() + 10000), sessaoVersao: 0 }), null)
  assert.equal(await rotacionarRefreshToken({ usuarioId: usuario.id, familiaId: randomUUID(), tokenAtualId: randomUUID(), novoTokenHash: hash, expiraEm: new Date(Date.now() + 10000), sessaoVersao: 0 }), false)
})

test('worker simulado entrega link com fragmento e persiste somente seu hash', async () => {
  const registro = await prisma.recuperacaoSenha.create({ data: { usuarioId: usuario.id, expiraEm: new Date(Date.now() + 600000), statusEmail: 'ENVIANDO' } })
  let mensagem
  const resumo = await processarFilaRecuperacao({ limite: 1 }, {
    habilitado: true, ambiente: 'test', destinatarioDemo: 'teste@lexis.example.com',
    reservar: async () => ({ ...registro, usuario: { email: usuario.email } }),
    enviar: async dados => { mensagem = dados },
  })
  assert.equal(resumo.enviados, 1)
  const link = new URL(mensagem.texto.match(/https?:\/\/\S+/)[0])
  assert.equal(link.pathname, '/redefinir-senha')
  assert.equal(link.search, '')
  const token = new URLSearchParams(link.hash.slice(1)).get('token')
  assert.match(token, /^[a-f0-9]{64}$/)
  const salvo = await prisma.recuperacaoSenha.findUnique({ where: { id: registro.id } })
  assert.equal(salvo.tokenHash, criarHashToken(token))
  assert.equal(salvo.statusEmail, 'ENVIADO')
  assert.equal(JSON.stringify(salvo).includes(token), false)
})

test('falha de envio invalida o link e não guarda a exceção sensível', async () => {
  const registro = await prisma.recuperacaoSenha.create({ data: { usuarioId: usuario.id, expiraEm: new Date(Date.now() + 600000), statusEmail: 'ENVIANDO' } })
  const resumo = await processarFilaRecuperacao({ limite: 1 }, {
    habilitado: true, ambiente: 'test', destinatarioDemo: 'teste@lexis.example.com',
    reservar: async () => ({ ...registro, usuario: { email: usuario.email } }),
    enviar: async () => { throw new Error('segredo-proibido-no-log') },
  })
  assert.equal(resumo.erros, 1)
  const salvo = await prisma.recuperacaoSenha.findUnique({ where: { id: registro.id } })
  assert.equal(salvo.tokenHash, null)
  assert.ok(salvo.consumidoEm)
  assert.equal(salvo.erroCodigo, 'PASSWORD_RECOVERY_EMAIL_FAILED')
})
