import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import express from 'express'
import request from 'supertest'

// Somente o provedor OCR e a geração externa de IA são substituídos.
// Autenticação, regras de domínio, repositories e persistência são reais.
process.env.OCR_SPACE_API_KEY ||= 'fixture-ocr-b03-key'
const { app } = await import('../../src/app.js')
const { prisma } = await import('../../src/config/prisma.js')
const { criarAnalisesIaRouter } = await import('../../src/modules/avaliacao-ia/analise-ia.routes.js')
const { solicitarAnaliseIaParaProfessor } = await import('../../src/modules/avaliacao-ia/analise-ia.service.js')
const { obterModeloCompetenciaDois } = await import('../../src/modules/temas/temas.competencia-dois.js')
const { errorHandler } = await import('../../src/middlewares/error-handler.js')

const fetchOriginal = globalThis.fetch
const usuarioIds = []
const textoOcr = 'A Constituição Federal de 1988 assegura o direito à educação. O acesso à tecnologia deve apoiar esse direito.'
let bancoConfirmado = false
let turmaId
let chamadasOcr = 0
let chamadasIa = 0

before(async () => {
  const [resultado] = await prisma.$queryRawUnsafe('SELECT DATABASE() AS banco')
  assert.equal(resultado.banco, 'lexis_test')
  bancoConfirmado = true
  globalThis.fetch = async () => {
    chamadasOcr += 1
    return new Response(JSON.stringify({ OCRExitCode: 1, IsErroredOnProcessing: false, ParsedResults: [{ ParsedText: textoOcr }] }), { status: 200 })
  }
})

after(async () => {
  globalThis.fetch = fetchOriginal
  if (bancoConfirmado && usuarioIds.length) {
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: usuarioIds } } })
    await prisma.feedbackVersao.deleteMany({ where: { professorId: { in: usuarioIds } } })
    await prisma.feedback.deleteMany({ where: { redacao: { alunoId: { in: usuarioIds } } } })
    await prisma.analiseIA.deleteMany({ where: { solicitadaPorId: { in: usuarioIds } } })
    await prisma.redacao.deleteMany({ where: { alunoId: { in: usuarioIds } } })
    if (turmaId) {
      await prisma.temaRedacao.deleteMany({ where: { turmaId } })
      await prisma.matricula.deleteMany({ where: { turmaId } })
      await prisma.turma.deleteMany({ where: { id: turmaId } })
    }
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } })
  }
  await prisma.$disconnect()
})

const testeApp = express()
testeApp.use(express.json())
testeApp.use('/api', criarAnalisesIaRouter({
  solicitarAnalise: (dados) => solicitarAnaliseIaParaProfessor(dados, {
    gerar: async () => {
      chamadasIa += 1
      return { texto: JSON.stringify({
        resumoGeral: 'Fixture consultiva B03, sujeita à revisão humana.',
        pontosFortes: ['Referência constitucional identificada.'],
        pontosDeAtencao: ['O professor deve conferir a articulação.'],
        analisePorCriterio: obterModeloCompetenciaDois().criterios.map((criterio, indice) => ({
          ordem: indice + 1, criterio: criterio.nome,
          diagnostico: 'Diagnóstico fictício para aceite integrado.',
          evidencias: indice === 0 ? [{ trecho: 'A Constituição Federal de 1988', inicio: 0, fim: 'A Constituição Federal de 1988'.length }] : [],
          orientacaoAoProfessor: 'Revise e decida independentemente da sugestão.',
        })),
        observacoesFinais: 'Sem nota e sem publicação automática.',
      }) }
    },
  }),
}))
testeApp.use(app)
testeApp.use(errorHandler)

async function criarSessao(papel) {
  const email = `teste.b03.${randomUUID()}@lexis.example.com`
  const senha = 'SenhaFicticiaB03!'
  const cadastro = await request(testeApp).post('/api/auth/cadastro').send({ nome: `Demo B03 ${papel}`, email, senha, papel }).expect(201)
  usuarioIds.push(cadastro.body.data.usuario.id)
  const login = await request(testeApp).post('/api/auth/login').send({ email, senha }).expect(200)
  return { id: cadastro.body.data.usuario.id, token: login.body.data.accessToken }
}

test('aceite B03: acesso, turma, proposta vencida, OCR revisado, envio, IA consultiva e feedback humano', async () => {
  const professor = await criarSessao('PROFESSOR')
  const aluno = await criarSessao('ALUNO')
  const colega = await criarSessao('ALUNO')
  const auth = (sessao) => `Bearer ${sessao.token}`

  const turma = await request(testeApp).post('/api/turmas').set('Authorization', auth(professor)).send({ nome: 'Turma fictícia de aceite B03' }).expect(201)
  turmaId = turma.body.data.turma.id
  await request(testeApp).post('/api/turmas/entrar').set('Authorization', auth(aluno)).send({ codigoAcesso: turma.body.data.turma.codigoAcesso }).expect(201)
  const criada = await request(testeApp).post(`/api/turmas/${turmaId}/temas`).set('Authorization', auth(professor)).send({
    enunciado: 'Tecnologia e direito à educação - aceite fictício B03',
    descricao: 'Discuta a democratização do acesso à tecnologia na educação.',
    prazoEntrega: new Date(Date.now() + 86_400_000).toISOString(),
    criterios: obterModeloCompetenciaDois().criterios,
  }).expect(201)
  const tema = criada.body.data.tema
  // Simula a passagem do prazo apenas na proposta criada por este teste.
  await prisma.temaRedacao.update({ where: { id: tema.id }, data: { prazoEntrega: new Date(Date.now() - 86_400_000) } })
  const lista = await request(testeApp).get('/api/aluno/temas').set('Authorization', auth(aluno)).expect(200)
  assert.ok(lista.body.data.temas.some((item) => item.id === tema.id))
  await request(testeApp).get(`/api/aluno/temas/${tema.id}`).set('Authorization', auth(aluno)).expect(200)

  const raiz = `/api/aluno/temas/${tema.id}/redacao`
  const ocr = await request(testeApp).post(`${raiz}/ocr`).set('Authorization', auth(aluno)).attach('imagem', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), { filename: 'ficticia.jpg', contentType: 'image/jpeg' }).expect(200)
  assert.equal(ocr.body.data.textoExtraido, textoOcr)
  assert.equal(ocr.body.data.revisaoObrigatoria, true)
  await request(testeApp).post(`${raiz}/enviar`).set('Authorization', auth(aluno)).expect(404)
  const revisado = await request(testeApp).put(`${raiz}/ocr/revisao`).set('Authorization', auth(aluno)).send({ texto: textoOcr }).expect(200)
  assert.equal(revisado.body.data.redacao.origemTexto, 'OCR')
  assert.ok(revisado.body.data.redacao.ocrRevisadoEm)
  const envio = await request(testeApp).post(`${raiz}/enviar`).set('Authorization', auth(aluno)).expect(200)
  const redacaoId = envio.body.data.redacao.id
  assert.equal(envio.body.data.redacao.enviadaComAtraso, true)
  await request(testeApp).put(raiz).set('Authorization', auth(aluno)).send({ texto: 'Alteração após o envio.' }).expect(409)

  const analise = await request(testeApp).post(`/api/redacoes/${redacaoId}/analises-ia`).set('Authorization', auth(professor)).expect(201)
  assert.equal(analise.body.data.analise.status, 'CONCLUIDA')
  assert.equal(analise.body.data.analise.resultadoEstruturado.analisePorCriterio.length, 3)
  assert.equal(await prisma.feedback.count({ where: { redacaoId } }), 0)
  assert.equal((await prisma.redacao.findUnique({ where: { id: redacaoId } })).status, 'ENVIADA')

  const humano = { competencia1: 160, competencia2: 120, competencia3: 160, competencia4: 160, competencia5: 160, comentarioGeral: 'Feedback humano fictício de aceite B03.', criterios: tema.criterios.map((criterio) => ({ criterioId: criterio.id, comentario: `Revisão humana de ${criterio.nome}.` })) }
  const salvo = await request(testeApp).put(`/api/redacoes/${redacaoId}/feedback`).set('Authorization', auth(professor)).send(humano).expect(200)
  assert.equal(salvo.body.data.feedback.status, 'RASCUNHO')
  await request(testeApp).get(`/api/aluno/redacoes/${redacaoId}/feedback`).set('Authorization', auth(aluno)).expect(404)
  const publicado = await request(testeApp).post(`/api/redacoes/${redacaoId}/feedback/publicar`).set('Authorization', auth(professor)).expect(200)
  assert.equal(publicado.body.data.feedback.nota, 760)
  const feedback = await request(testeApp).get(`/api/aluno/redacoes/${redacaoId}/feedback`).set('Authorization', auth(aluno)).expect(200)
  assert.equal(feedback.body.data.feedback.status, 'PUBLICADA')
  assert.equal(feedback.body.data.feedback.comentarioGeral, humano.comentarioGeral)
  await request(testeApp).get(`/api/aluno/redacoes/${redacaoId}/feedback`).set('Authorization', auth(colega)).expect(404)
  const notificacoes = await request(testeApp).get('/api/aluno/notificacoes').set('Authorization', auth(aluno)).expect(200)
  assert.equal(notificacoes.body.data.totalNaoLidas, 1)
  assert.equal(chamadasOcr, 1)
  assert.equal(chamadasIa, 1)
})
