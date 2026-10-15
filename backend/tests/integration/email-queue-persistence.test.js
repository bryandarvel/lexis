import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { after, before, beforeEach, test } from 'node:test'

import { prisma } from '../../src/config/prisma.js'
import { obterModeloCompetenciaDois } from '../../src/modules/temas/temas.competencia-dois.js'
import { processarFilaEmailsNotificacao } from '../../src/modules/notificacoes/notificacoes-email.service.js'
import { reservarProximaNotificacaoEmail } from '../../src/modules/notificacoes/notificacoes-email.repository.js'
import { processarFilaRecuperacao } from '../../src/modules/auth/password-recovery.service.js'
import { reservarRecuperacao } from '../../src/modules/auth/password-recovery.repository.js'
import { criarHashToken } from '../../src/modules/auth/auth-token.service.js'

const agora = new Date('2030-01-01T12:00:00Z')
const futuro = new Date(agora.getTime() + 60000)
const usuarioIds = []
let bancoConfirmado = false
let professor
let aluno
let turma
let versao

// Preserva os filtros reais do repository e acrescenta somente isolamento.
// Nada é reservado ou removido fora dos registros criados por esta suíte.
function clienteEscopado(modelo, where, concorrente = false) {
  let chegadas = 0
  let liberar
  const barreira = new Promise((resolve) => { liberar = resolve })
  return {
    [modelo]: {
      findFirst: async (args) => {
        const registro = await prisma[modelo].findFirst({ ...args, where: { AND: [args.where, where] } })
        if (concorrente) {
          chegadas += 1
          if (chegadas === 2) liberar()
          await barreira
        }
        return registro
      },
      updateMany: (args) => prisma[modelo].updateMany({ ...args, where: { AND: [args.where, where] } }),
      findUnique: (args) => prisma[modelo].findUnique(args),
    },
  }
}

const opcoesNotificacao = {
  habilitado: true, ambiente: 'test', destinatarioDemonstracao: 'operador@lexis.example.com',
  maxTentativas: 3, atrasoTentativaMs: 60000, agora: () => agora,
}
const opcoesRecuperacao = {
  habilitado: true, ambiente: 'test', destinatarioDemo: 'operador@lexis.example.com',
  frontendUrl: 'http://localhost:5173', agora: () => agora,
}

before(async () => {
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  bancoConfirmado = true
  for (const papel of ['PROFESSOR', 'ALUNO']) {
    const usuario = await prisma.usuario.create({ data: {
      nome: `Fila fictícia ${papel}`, email: `fila.${randomUUID()}@lexis.example.com`,
      senhaHash: 'fixture-nao-utilizada-em-login', papel,
    } })
    usuarioIds.push(usuario.id)
    if (papel === 'PROFESSOR') professor = usuario
    else aluno = usuario
  }
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codigoAcesso = [...randomBytes(8)].map((byte) => alfabeto[byte % alfabeto.length]).join('')
  turma = await prisma.turma.create({ data: { professorId: professor.id, nome: 'Fila fictícia B30', codigoAcesso } })
  const tema = await prisma.temaRedacao.create({ data: {
    turmaId: turma.id, enunciado: 'Fixture operacional de e-mail', descricao: 'Sem conteúdo real.', prazoEntrega: futuro,
    criterios: { create: obterModeloCompetenciaDois().criterios.map((criterio, indice) => ({ ...criterio, ordem: indice + 1 })) },
  } })
  const redacao = await prisma.redacao.create({ data: {
    alunoId: aluno.id, temaId: tema.id, texto: 'Texto sintético de teste.', status: 'AVALIADA', enviadaEm: agora,
  } })
  const feedback = await prisma.feedback.create({ data: { redacaoId: redacao.id } })
  versao = await prisma.feedbackVersao.create({ data: {
    feedbackId: feedback.id, professorId: professor.id, numero: 1, status: 'PUBLICADA', publicadoEm: agora,
    competencia1: 160, competencia2: 160, competencia3: 160, competencia4: 160, competencia5: 160,
    nota: 800, comentarioGeral: 'Fixture humana operacional.',
  } })
})

beforeEach(async () => {
  assert.ok(bancoConfirmado)
  await prisma.notificacao.deleteMany({ where: { usuarioId: aluno.id } })
  await prisma.recuperacaoSenha.deleteMany({ where: { usuarioId: { in: usuarioIds } } })
})

after(async () => {
  if (bancoConfirmado && usuarioIds.length) {
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: usuarioIds } } })
    await prisma.feedbackVersao.deleteMany({ where: { professorId: { in: usuarioIds } } })
    await prisma.feedback.deleteMany({ where: { redacao: { alunoId: { in: usuarioIds } } } })
    await prisma.redacao.deleteMany({ where: { alunoId: { in: usuarioIds } } })
    if (turma) {
      await prisma.temaRedacao.deleteMany({ where: { turmaId: turma.id } })
      await prisma.turma.delete({ where: { id: turma.id } })
    }
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } })
  }
  await prisma.$disconnect()
})

function criarNotificacao(data = {}) {
  return prisma.notificacao.create({ data: {
    usuarioId: aluno.id, feedbackVersaoId: versao.id, emailDestino: aluno.email,
    tipo: 'FEEDBACK_PUBLICADO', titulo: 'Correção disponível', mensagem: 'Consulte o sistema.', ...data,
  } })
}

test('duas reservas reais de notificação produzem um envio e não reenviam ENVIADO', async () => {
  const item = await criarNotificacao()
  const client = clienteEscopado('notificacao', { id: item.id }, true)
  const enviados = []
  const opcoes = { ...opcoesNotificacao, reservar: (args) => reservarProximaNotificacaoEmail(args, client), enviar: async (dados) => { enviados.push(dados.chaveIdempotencia) } }
  const resultados = await Promise.all([processarFilaEmailsNotificacao({ limite: 1 }, opcoes), processarFilaEmailsNotificacao({ limite: 1 }, opcoes)])
  assert.equal(resultados.reduce((soma, r) => soma + r.enviados, 0), 1)
  assert.deepEqual(enviados, [`lexis-notificacao/${item.id}`])
  const salvo = await prisma.notificacao.findUnique({ where: { id: item.id } })
  assert.equal(salvo.statusEmail, 'ENVIADO')
  assert.equal(salvo.tentativasEmail, 1)
  const repetido = await processarFilaEmailsNotificacao({ limite: 1 }, { ...opcoes, reservar: (args) => reservarProximaNotificacaoEmail(args, clienteEscopado('notificacao', { id: item.id })) })
  assert.equal(repetido.processados, 0)
})

test('falha real agendada só volta após o atraso e conserva chave de idempotência', async () => {
  const item = await criarNotificacao()
  const reservar = (args) => reservarProximaNotificacaoEmail(args, clienteEscopado('notificacao', { id: item.id }))
  const chaves = []
  const falha = await processarFilaEmailsNotificacao({ limite: 1 }, { ...opcoesNotificacao, reservar, enviar: async (dados) => {
    chaves.push(dados.chaveIdempotencia)
    throw new Error('segredo-ficticio-que-nao-deve-ser-persistido')
  } })
  assert.equal(falha.erros, 1)
  const salvo = await prisma.notificacao.findUnique({ where: { id: item.id } })
  assert.equal(salvo.statusEmail, 'ERRO')
  assert.equal(salvo.ultimoErroEmail, 'EMAIL_SEND_FAILED')
  assert.equal(salvo.proximaTentativaEm.getTime(), futuro.getTime())
  assert.equal(await reservar({ agora, maxTentativas: 3 }), null)
  const sucesso = await processarFilaEmailsNotificacao({ limite: 1 }, {
    ...opcoesNotificacao, agora: () => futuro, reservar, enviar: async (dados) => { chaves.push(dados.chaveIdempotencia) },
  })
  assert.equal(sucesso.enviados, 1)
  assert.deepEqual(chaves, [`lexis-notificacao/${item.id}`, `lexis-notificacao/${item.id}`])
  const concluido = await prisma.notificacao.findUnique({ where: { id: item.id } })
  assert.equal(concluido.tentativasEmail, 2)
  assert.equal(concluido.ultimoErroEmail, null)
})

test('fila ignora limite esgotado e não recupera ENVIANDO automaticamente', async () => {
  await criarNotificacao({ statusEmail: 'ERRO', tentativasEmail: 3 })
  await criarNotificacao({ statusEmail: 'ENVIANDO', tentativasEmail: 1 })
  assert.equal(await reservarProximaNotificacaoEmail({ agora, maxTentativas: 3 }, clienteEscopado('notificacao', { usuarioId: aluno.id })), null)
})

test('limite do lote é respeitado e envio desabilitado não reserva registros', async () => {
  await criarNotificacao()
  await criarNotificacao()
  const client = clienteEscopado('notificacao', { usuarioId: aluno.id })
  let chamadas = 0
  const resumo = await processarFilaEmailsNotificacao({ limite: 1 }, { ...opcoesNotificacao, reservar: (args) => reservarProximaNotificacaoEmail(args, client), enviar: async () => { chamadas += 1 } })
  assert.equal(resumo.processados, 1)
  assert.equal(chamadas, 1)
  assert.equal(await prisma.notificacao.count({ where: { usuarioId: aluno.id, statusEmail: 'PENDENTE' } }), 1)
  const desabilitado = await processarFilaEmailsNotificacao({}, { habilitado: false, reservar: async () => { throw Error('Reserva indevida') } })
  assert.equal(desabilitado.processados, 0)
})

test('duas reservas de recuperação enviam uma vez e persistem somente hash', async () => {
  const item = await prisma.recuperacaoSenha.create({ data: { usuarioId: aluno.id, expiraEm: futuro } })
  const client = clienteEscopado('recuperacaoSenha', { id: item.id }, true)
  let mensagem
  let chamadas = 0
  const opcoes = { ...opcoesRecuperacao, reservar: (args) => reservarRecuperacao(args, client), enviar: async (dados) => { chamadas += 1; mensagem = dados } }
  const resultados = await Promise.all([processarFilaRecuperacao({ limite: 1 }, opcoes), processarFilaRecuperacao({ limite: 1 }, opcoes)])
  assert.equal(resultados.reduce((soma, r) => soma + r.enviados, 0), 1)
  assert.equal(chamadas, 1)
  assert.equal(mensagem.destinatario, 'operador@lexis.example.com')
  const link = new URL(mensagem.texto.match(/https?:\/\/\S+/)[0])
  const token = new URLSearchParams(link.hash.slice(1)).get('token')
  const salvo = await prisma.recuperacaoSenha.findUnique({ where: { id: item.id } })
  assert.equal(link.search, '')
  assert.equal(salvo.tokenHash, criarHashToken(token))
  assert.equal(salvo.statusEmail, 'ENVIADO')
  assert.equal(JSON.stringify(salvo).includes(token), false)
})

test('recuperação falha invalida o hash, não repete a solicitação e ignora expiradas', async () => {
  const item = await prisma.recuperacaoSenha.create({ data: { usuarioId: aluno.id, expiraEm: futuro } })
  const client = clienteEscopado('recuperacaoSenha', { usuarioId: aluno.id })
  const resumo = await processarFilaRecuperacao({ limite: 1 }, { ...opcoesRecuperacao, reservar: (args) => reservarRecuperacao(args, client), enviar: async () => { throw Error('segredo-ficticio') } })
  assert.equal(resumo.erros, 1)
  const salvo = await prisma.recuperacaoSenha.findUnique({ where: { id: item.id } })
  assert.equal(salvo.statusEmail, 'ERRO')
  assert.equal(salvo.erroCodigo, 'PASSWORD_RECOVERY_EMAIL_FAILED')
  assert.equal(salvo.tokenHash, null)
  assert.ok(salvo.consumidoEm)
  await prisma.recuperacaoSenha.create({ data: { usuarioId: aluno.id, expiraEm: new Date(agora.getTime() - 1) } })
  assert.equal(await reservarRecuperacao({ agora }, client), null)
})
