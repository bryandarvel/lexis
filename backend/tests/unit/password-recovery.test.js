import assert from 'node:assert/strict'
import test from 'node:test'
import { solicitarRecuperacaoSenha, processarFilaRecuperacao } from '../../src/modules/auth/password-recovery.service.js'
import { criarAutenticadorAccessToken } from '../../src/middlewares/authenticate-access-token.js'
import { criarAccessToken } from '../../src/modules/auth/auth-token.service.js'

test('recuperação indisponível produz o mesmo erro sem consultar contas', async () => {
  await assert.rejects(solicitarRecuperacaoSenha({ email: 'teste@lexis.example.com' }, {
    habilitado: false, buscar: async () => assert.fail('Não deveria consultar'),
  }), { code: 'PASSWORD_RECOVERY_UNAVAILABLE' })
})

test('conta inativa tem resposta genérica e não recebe recuperação', async () => {
  const data = await solicitarRecuperacaoSenha({ email: 'teste@lexis.example.com' }, {
    habilitado: true, buscar: async () => ({ ativo: false }), enfileirar: async () => assert.fail('Não deveria enfileirar'),
  })
  assert.match(data.mensagem, /Se houver/)
})

test('demonstração não envia reset de conta real para destinatário diferente', async () => {
  let finalizacao
  const resumo = await processarFilaRecuperacao({ limite: 1 }, {
    habilitado: true, ambiente: 'test', destinatarioDemo: 'teste@lexis.example.com',
    reservar: async () => ({ id: 'recuperacao', usuario: { email: 'pessoa@example.org' } }),
    enviar: async () => assert.fail('Não deve enviar'),
    concluir: async dados => { finalizacao = dados },
  })
  assert.equal(resumo.erros, 1)
  assert.equal(finalizacao.sucesso, false)
})

test('middleware recusa versões antigas, contas inativas e inexistentes', async () => {
  const token = criarAccessToken({ usuarioId: 'teste', papel: 'PROFESSOR', sessaoVersao: 0 })
  for (const usuario of [null, { ativo: false, sessaoVersao: 0 }, { ativo: true, sessaoVersao: 1 }]) {
    let erro
    const autenticar = criarAutenticadorAccessToken({ buscarUsuario: async () => usuario })
    const req = { headers: { authorization: `Bearer ${token}` } }
    await autenticar(req, {}, e => { erro = e })
    assert.equal(erro.statusCode, 401)
    assert.equal(req.auth, undefined)
  }
})
