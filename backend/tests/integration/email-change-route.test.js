import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { autenticarUsuario, cadastrarUsuario } from '../../src/modules/auth/auth.service.js'
import { criarHashToken } from '../../src/modules/auth/auth-token.service.js'
import { confirmarAlteracaoEmail, solicitarAlteracaoEmail } from '../../src/modules/auth/email-change.service.js'
import { enfileirarRecuperacao } from '../../src/modules/auth/password-recovery.repository.js'

const senha = 'SenhaFicticiaEmail123!'
const ids = []
const novo = () => `troca.${randomUUID()}@lexis.example.com`
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
  try {
    if (confirmado) await prisma.usuario.deleteMany({ where: { id: { in: ids } } })
  } finally {
    await prisma.$disconnect()
  }
})

async function conta(papel = 'ALUNO') {
  const usuario = await cadastrarUsuario({ nome: 'Pessoa Fictícia', email: novo(), senha, papel })
  ids.push(usuario.id)
  return { usuario, sessao: await autenticarUsuario({ email: usuario.email, senha }) }
}

const auth = sessao => ({ Authorization: `Bearer ${sessao.accessToken}` })
const solicitar = (sessao, dados) => request(app).post('/api/auth/alterar-email').set(auth(sessao)).send(dados)
const confirmar = token => request(app).post('/api/auth/confirmar-email').send({ token })

function extrairToken(texto) {
  const link = new URL(texto.match(/https?:\/\/\S+/u)[0])
  assert.equal(link.pathname, '/confirmar-email')
  assert.equal(link.search, '')
  const token = new URLSearchParams(link.hash.slice(1)).get('token')
  assert.match(token, /^[a-f0-9]{64}$/)
  return token
}

function simularEntrega(t, destino) {
  const orig = { EMAIL_ENABLED: env.EMAIL_ENABLED, EMAIL_DEMO_RECIPIENT: env.EMAIL_DEMO_RECIPIENT, RESEND_API_KEY: env.RESEND_API_KEY }
  Object.assign(env, { EMAIL_ENABLED: true, EMAIL_DEMO_RECIPIENT: destino, RESEND_API_KEY: 're_fixture_nunca_enviado' })
  t.after(() => Object.assign(env, orig))
  const mensagens = []
  t.mock.method(globalThis, 'fetch', async (url, opcoes) => {
    assert.equal(url, 'https://api.resend.com/emails')
    mensagens.push(JSON.parse(opcoes.body))
    return Response.json({ id: 'mock-resend' })
  })
  return mensagens
}

async function pedirPeloServico(usuario, novoEmail = novo(), opcoes = {}) {
  let token
  await solicitarAlteracaoEmail({
    usuarioId: usuario.id, sessaoVersao: 0, senhaAtual: senha, novoEmail,
  }, {
    habilitado: true, ambiente: 'production',
    enviar: async mensagem => {
      assert.equal(mensagem.destinatario, novoEmail)
      token = extrairToken(mensagem.texto)
    },
    ...opcoes,
  })
  return { token, novoEmail }
}

for (const papel of ['ALUNO', 'PROFESSOR']) {
  test(`${papel} altera e-mail só após confirmar o novo endereço e invalida as credenciais anteriores`, async t => {
    const { usuario, sessao } = await conta(papel)
    const segundaSessao = await autenticarUsuario({ email: usuario.email, senha })
    const novoEmail = novo()
    const mensagens = simularEntrega(t, novoEmail)
    const tokenSenha = randomBytes(32).toString('hex')
    const recuperacao = await prisma.recuperacaoSenha.create({ data: {
      usuarioId: usuario.id, tokenHash: criarHashToken(tokenSenha), statusEmail: 'ENVIADO', expiraEm: new Date(Date.now() + 600000),
    } })
    const pedido = await solicitar(sessao, { senhaAtual: senha, novoEmail: `  ${novoEmail.toUpperCase()}  ` }).expect(202)
    assert.deepEqual(Object.keys(pedido.body.data), ['mensagem'])
    assert.deepEqual(mensagens[0].to, [novoEmail])
    const token = extrairToken(mensagens[0].text)
    const pendente = await prisma.alteracaoEmail.findUniqueOrThrow({ where: { usuarioId: usuario.id } })
    assert.equal(pendente.tokenHash, criarHashToken(token))
    assert.equal(pendente.novoEmail, novoEmail)
    assert.equal((await autenticarUsuario({ email: usuario.email, senha })).usuario.id, usuario.id)
    await assert.rejects(autenticarUsuario({ email: novoEmail, senha }), { code: 'INVALID_CREDENTIALS' })
    assert.equal((await prisma.recuperacaoSenha.findUniqueOrThrow({ where: { id: recuperacao.id } })).consumidoEm, null)

    env.EMAIL_DEMO_RECIPIENT = usuario.email
    const resposta = await confirmar(token).expect(200)
    assert.equal(resposta.body.data.avisoEmailAnteriorEnviado, true)
    assert.match(resposta.headers['set-cookie'][0], /^lexis_refresh_token=;/)
    assert.deepEqual(mensagens[1].to, [usuario.email])
    assert.ok(!mensagens[1].text.includes(token) && !mensagens[1].text.includes(novoEmail))
    await confirmar(token).expect(422)
    assert.equal(mensagens.length, 2)
    await assert.rejects(autenticarUsuario({ email: usuario.email, senha }), { code: 'INVALID_CREDENTIALS' })
    assert.equal((await autenticarUsuario({ email: novoEmail, senha })).usuario.id, usuario.id)
    for (const antiga of [sessao, segundaSessao]) {
      await request(app).get('/api/auth/me').set(auth(antiga)).expect(401)
      await request(app).post('/api/auth/refresh').set('Cookie', `lexis_refresh_token=${antiga.refreshToken}`).expect(401)
    }
    await request(app).post('/api/auth/redefinir-senha').send({ token: tokenSenha, senha: 'NovaSenhaFicticia123!' }).expect(422)
    const resetAntigo = await enfileirarRecuperacao({
      usuarioId: usuario.id, emailEsperado: usuario.email, sessaoVersao: 0,
      agora: new Date(), expiraEm: new Date(Date.now() + 600000),
    })
    assert.equal(resetAntigo, false)
    const antes = await prisma.recuperacaoSenha.count({ where: { usuarioId: usuario.id } })
    await request(app).post('/api/auth/recuperar-senha').send({ email: novoEmail }).expect(202)
    assert.equal(await prisma.recuperacaoSenha.count({ where: { usuarioId: usuario.id } }), antes + 1)
    assert.equal(await prisma.alteracaoEmail.count({ where: { usuarioId: usuario.id } }), 0)
  })
}

test('rejeita entrada inválida, senha errada, e-mail atual e e-mail ocupado sem modificar o usuário', async t => {
  const { usuario, sessao } = await conta()
  const { usuario: outro } = await conta()
  const mensagens = simularEntrega(t, outro.email)
  const antes = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })
  await request(app).post('/api/auth/alterar-email').send({ senhaAtual: senha, novoEmail: novo() }).expect(401)
  await solicitar(sessao, { senhaAtual: senha, novoEmail: 'invalido' }).expect(422)
  await solicitar(sessao, { senhaAtual: senha, novoEmail: outro.email, usuarioId: outro.id }).expect(422)
  const senhaErrada = await solicitar(sessao, { senhaAtual: 'incorreta', novoEmail: outro.email }).expect(422)
  assert.equal(senhaErrada.body.error.code, 'CURRENT_PASSWORD_INVALID')
  const ocupado = await solicitar(sessao, { senhaAtual: senha, novoEmail: outro.email }).expect(409)
  assert.equal(ocupado.body.error.code, 'EMAIL_ALREADY_IN_USE')
  env.EMAIL_DEMO_RECIPIENT = usuario.email
  const igual = await solicitar(sessao, { senhaAtual: senha, novoEmail: usuario.email }).expect(422)
  assert.equal(igual.body.error.code, 'EMAIL_UNCHANGED')
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: usuario.id } }), antes)
  assert.equal(await prisma.alteracaoEmail.count({ where: { usuarioId: usuario.id } }), 0)
  assert.equal(mensagens.length, 0)
})

test('não redireciona link em demonstração e invalida o pedido se o envio falhar', async t => {
  const { usuario, sessao } = await conta()
  const destino = novo()
  const mensagens = simularEntrega(t, novo())
  await solicitar(sessao, { senhaAtual: senha, novoEmail: destino }).expect(503)
  assert.equal(mensagens.length, 0)
  await assert.rejects(pedirPeloServico(usuario, destino, { enviar: async () => { throw new Error('Sem entrega') } }),
    { code: 'EMAIL_CHANGE_DELIVERY_UNAVAILABLE' })
  assert.equal(await prisma.alteracaoEmail.count({ where: { usuarioId: usuario.id } }), 0)
  assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })).email, usuario.email)
})

test('recusa token expirado e token substituído, e só uma confirmação concorrente vence', async () => {
  const { usuario } = await conta()
  const antigo = await pedirPeloServico(usuario)
  const expirado = await pedirPeloServico(usuario, novo(), { agora: () => new Date(Date.now() - 3600000) })
  await confirmar(antigo.token).expect(422)
  await confirmar(expirado.token).expect(422)
  const valido = await pedirPeloServico(usuario)
  const respostas = await Promise.all([confirmar(valido.token), confirmar(valido.token)])
  assert.deepEqual(respostas.map(r => r.status).sort(), [200, 422])
  const atual = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })
  assert.equal(atual.email, valido.novoEmail)
  assert.equal(atual.sessaoVersao, 1)
})

test('duas contas disputando o mesmo e-mail têm um vencedor e não revogam a sessão perdedora', async () => {
  const contas = [await conta(), await conta('PROFESSOR')]
  const email = novo()
  const pedidos = await Promise.all(contas.map(({ usuario }) => pedirPeloServico(usuario, email)))
  const respostas = await Promise.all(pedidos.map(({ token }) => confirmar(token)))
  assert.deepEqual(respostas.map(r => r.status).sort(), [200, 409])
  const perdeu = respostas.findIndex(r => r.status === 409)
  assert.equal(respostas[perdeu].body.error.code, 'EMAIL_ALREADY_IN_USE')
  await request(app).get('/api/auth/me').set(auth(contas[perdeu].sessao)).expect(200)
  assert.equal(await prisma.usuario.count({ where: { email } }), 1)
  assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id: contas[perdeu].usuario.id } })).email, contas[perdeu].usuario.email)
})

test('redefinir senha ou excluir conta invalida e remove pedido de troca de e-mail', async () => {
  const primeira = await conta()
  const pedidoSenha = await pedirPeloServico(primeira.usuario)
  const token = randomBytes(32).toString('hex')
  await prisma.recuperacaoSenha.create({ data: {
    usuarioId: primeira.usuario.id, tokenHash: criarHashToken(token), statusEmail: 'ENVIADO', expiraEm: new Date(Date.now() + 600000),
  } })
  await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'NovaSenhaFicticia123!' }).expect(204)
  await confirmar(pedidoSenha.token).expect(422)
  const segunda = await conta()
  const pedidoExclusao = await pedirPeloServico(segunda.usuario)
  await request(app).delete('/api/auth/me').set(auth(segunda.sessao)).send({ senhaAtual: senha }).expect(204)
  await confirmar(pedidoExclusao.token).expect(422)
  assert.equal(await prisma.alteracaoEmail.count({ where: { usuarioId: { in: [primeira.usuario.id, segunda.usuario.id] } } }), 0)
})

test('falha no aviso ao endereço antigo não desfaz a troca já confirmada', async () => {
  const { usuario } = await conta()
  const pedido = await pedirPeloServico(usuario)
  const resposta = await confirmarAlteracaoEmail({ token: pedido.token }, {
    habilitado: true, ambiente: 'production',
    enviar: async () => { throw new Error('Falha simulada no provedor') },
  })
  assert.deepEqual(resposta, { avisoEmailAnteriorEnviado: false })
  assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } })).email, pedido.novoEmail)
})
