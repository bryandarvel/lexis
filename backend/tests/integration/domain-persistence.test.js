import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'

process.env.OCR_SPACE_API_KEY ||= 'fixture-b35-ocr-key'
const { app } = await import('../../src/app.js')
const { env } = await import('../../src/config/env.js')
const { prisma } = await import('../../src/config/prisma.js')
const { obterModeloCompetenciaDois } = await import('../../src/modules/temas/temas.competencia-dois.js')
const { iniciarAnaliseIa, falharAnaliseIa } = await import('../../src/modules/avaliacao-ia/analise-ia.repository.js')
const { solicitarAnaliseIaParaProfessor } = await import('../../src/modules/avaliacao-ia/analise-ia.service.js')
const { transcreverImagemParaAluno, revisarLinguagemParaAluno } = await import('../../src/modules/redacoes/redacoes.service.js')

const usuarioIds = []
const turmaIds = []
let confirmado = false
let professor
let outroProfessor
let aluno
let outroAluno
let turma

async function criarSessao(papel) {
  const email = `dominio.${randomUUID()}@lexis.example.com`
  const senha = 'SenhaFicticiaB35!'
  const cadastro = await request(app).post('/api/auth/cadastro').send({ nome: `Fixture ${papel}`, email, senha, papel }).expect(201)
  const id = cadastro.body.data.usuario.id
  usuarioIds.push(id)
  const login = await request(app).post('/api/auth/login').send({ email, senha }).expect(200)
  return { id, token: login.body.data.accessToken }
}
const auth = (sessao) => `Bearer ${sessao.token}`

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
  professor = await criarSessao('PROFESSOR')
  outroProfessor = await criarSessao('PROFESSOR')
  aluno = await criarSessao('ALUNO')
  outroAluno = await criarSessao('ALUNO')
  const criada = await request(app).post('/api/turmas').set('Authorization', auth(professor)).send({ nome: 'Domínio fictício B35' }).expect(201)
  turma = criada.body.data.turma
  turmaIds.push(turma.id)
  const outra = await request(app).post('/api/turmas').set('Authorization', auth(outroProfessor)).send({ nome: 'Outro responsável B35' }).expect(201)
  turmaIds.push(outra.body.data.turma.id)
  await request(app).post('/api/turmas/entrar').set('Authorization', auth(aluno)).send({ codigoAcesso: turma.codigoAcesso }).expect(201)
  await request(app).post('/api/turmas/entrar').set('Authorization', auth(outroAluno)).send({ codigoAcesso: outra.body.data.turma.codigoAcesso }).expect(201)
})

after(async () => {
  if (confirmado && usuarioIds.length) {
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: usuarioIds } } })
    await prisma.feedbackVersao.deleteMany({ where: { professorId: { in: usuarioIds } } })
    await prisma.feedback.deleteMany({ where: { redacao: { alunoId: { in: usuarioIds } } } })
    await prisma.analiseIA.deleteMany({ where: { solicitadaPorId: { in: usuarioIds } } })
    await prisma.redacao.deleteMany({ where: { alunoId: { in: usuarioIds } } })
    await prisma.temaRedacao.deleteMany({ where: { turmaId: { in: turmaIds } } })
    await prisma.matricula.deleteMany({ where: { alunoId: { in: usuarioIds } } })
    await prisma.turma.deleteMany({ where: { id: { in: turmaIds } } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } })
  }
  await prisma.$disconnect()
})

async function criarRedacao({ enviar = true } = {}) {
  const proposta = await request(app).post(`/api/turmas/${turma.id}/temas`).set('Authorization', auth(professor)).send({
    enunciado: `Proposta fictícia ${randomUUID()}`, descricao: 'Teste de persistência, sem conteúdo real.',
    prazoEntrega: new Date(Date.now() + 86400000).toISOString(), criterios: obterModeloCompetenciaDois().criterios,
  }).expect(201)
  const tema = proposta.body.data.tema
  const texto = 'A Constituição Federal assegura o direito à educação. O acesso à tecnologia deve apoiar esse direito.'
  const rascunho = await request(app).put(`/api/aluno/temas/${tema.id}/redacao`).set('Authorization', auth(aluno)).send({ texto }).expect(200)
  if (enviar) await request(app).post(`/api/aluno/temas/${tema.id}/redacao/enviar`).set('Authorization', auth(aluno)).expect(200)
  return { tema, texto, redacao: rascunho.body.data.redacao }
}

function feedbackHumano(tema, valor = 160) {
  return {
    competencia1: valor, competencia2: valor, competencia3: valor, competencia4: valor, competencia5: valor,
    comentarioGeral: `Comentário humano fictício ${valor}.`,
    criterios: tema.criterios.map((criterio) => ({ criterioId: criterio.id, comentario: `Revisão humana de ${criterio.nome}.` })),
  }
}
async function salvarPublicar(fixture, valor = 160) {
  await request(app).put(`/api/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(professor)).send(feedbackHumano(fixture.tema, valor)).expect(200)
  return request(app).post(`/api/redacoes/${fixture.redacao.id}/feedback/publicar`).set('Authorization', auth(professor)).expect(200)
}

test('feedback preserva publicação enquanto há rascunho novo e mantém histórico na republicação', async () => {
  const fixture = await criarRedacao()
  const primeiro = await salvarPublicar(fixture)
  const publicadoId = primeiro.body.data.feedback.id
  const novo = await request(app).put(`/api/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(professor)).send(feedbackHumano(fixture.tema, 120)).expect(200)
  assert.equal(novo.body.data.feedback.numero, 2)
  const alunoAntes = await request(app).get(`/api/aluno/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(aluno)).expect(200)
  assert.equal(alunoAntes.body.data.feedback.id, publicadoId)
  assert.equal(alunoAntes.body.data.feedback.nota, 800)
  await request(app).get(`/api/aluno/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(outroAluno)).expect(404)
  await request(app).get(`/api/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(outroProfessor)).expect(404)
  const segundo = await request(app).post(`/api/redacoes/${fixture.redacao.id}/feedback/publicar`).set('Authorization', auth(professor)).expect(200)
  assert.equal(segundo.body.data.feedback.nota, 600)
  const historico = await request(app).get(`/api/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(professor)).expect(200)
  assert.deepEqual(historico.body.data.feedback.historico.map((v) => [v.numero, v.status, v.nota]), [[2, 'PUBLICADA', 600], [1, 'SUBSTITUIDA', 800]])
  const atual = await request(app).get(`/api/aluno/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(aluno)).expect(200)
  assert.equal(atual.body.data.feedback.id, segundo.body.data.feedback.id)
  assert.equal(await prisma.notificacao.count({ where: { feedbackVersao: { feedback: { redacaoId: fixture.redacao.id } } } }), 2)
  await request(app).post(`/api/redacoes/${fixture.redacao.id}/feedback/publicar`).set('Authorization', auth(professor)).expect(409)
  assert.equal(await prisma.notificacao.count({ where: { feedbackVersao: { feedback: { redacaoId: fixture.redacao.id } } } }), 2)
})

test('publicação concorrente tem um vencedor, uma versão publicada e uma notificação', async () => {
  const fixture = await criarRedacao()
  await request(app).put(`/api/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(professor)).send(feedbackHumano(fixture.tema)).expect(200)
  const respostas = await Promise.all([1, 2].map(() => request(app).post(`/api/redacoes/${fixture.redacao.id}/feedback/publicar`).set('Authorization', auth(professor))))
  assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 409])
  assert.equal(await prisma.feedbackVersao.count({ where: { feedback: { redacaoId: fixture.redacao.id }, status: 'PUBLICADA' } }), 1)
  assert.equal(await prisma.notificacao.count({ where: { feedbackVersao: { feedback: { redacaoId: fixture.redacao.id } } } }), 1)
})

test('rascunho incompleto, critério de outro tema e outro professor não criam publicação', async () => {
  const fixture = await criarRedacao()
  const outra = await criarRedacao()
  const raiz = `/api/redacoes/${fixture.redacao.id}/feedback`
  await request(app).put(raiz).set('Authorization', auth(outroProfessor)).send(feedbackHumano(fixture.tema)).expect(404)
  await request(app).put(raiz).set('Authorization', auth(professor)).send({ ...feedbackHumano(fixture.tema), criterios: [{ criterioId: outra.tema.criterios[0].id, comentario: 'Critério incorreto.' }] }).expect(422)
  assert.equal(await prisma.feedback.count({ where: { redacaoId: fixture.redacao.id } }), 0)
  await request(app).put(raiz).set('Authorization', auth(professor)).send({ ...feedbackHumano(fixture.tema), competencia5: null }).expect(200)
  const erro = await request(app).post(`${raiz}/publicar`).set('Authorization', auth(professor)).expect(422)
  assert.equal(erro.body.error.code, 'FEEDBACK_INCOMPLETE')
  assert.equal(await prisma.notificacao.count({ where: { feedbackVersao: { feedback: { redacaoId: fixture.redacao.id } } } }), 0)
  const rascunho = await prisma.feedbackVersao.findFirst({ where: { feedback: { redacaoId: fixture.redacao.id } } })
  assert.equal(rascunho.status, 'RASCUNHO')
  await request(app).get(`/api/aluno/redacoes/${fixture.redacao.id}/feedback`).set('Authorization', auth(aluno)).expect(404)
})

test('notificação lida persiste, é idempotente e não pode ser lida por outro aluno', async () => {
  const fixture = await criarRedacao()
  const publicada = await salvarPublicar(fixture)
  const id = publicada.body.data.notificacao.id
  await request(app).patch(`/api/aluno/notificacoes/${id}/lida`).set('Authorization', auth(outroAluno)).expect(404)
  assert.equal((await prisma.notificacao.findUnique({ where: { id } })).lidaEm, null)
  const primeira = await request(app).patch(`/api/aluno/notificacoes/${id}/lida`).set('Authorization', auth(aluno)).expect(200)
  const repetida = await request(app).patch(`/api/aluno/notificacoes/${id}/lida`).set('Authorization', auth(aluno)).expect(200)
  assert.equal(primeira.body.data.notificacao.lidaEm, repetida.body.data.notificacao.lidaEm)
  assert.ok((await prisma.notificacao.findUnique({ where: { id } })).lidaEm)
  const listaOutro = await request(app).get('/api/aluno/notificacoes').set('Authorization', auth(outroAluno)).expect(200)
  assert.equal(listaOutro.body.data.notificacoes.some((n) => n.id === id), false)
})

test('reserva real concorrente de IA tem um vencedor e conserva o snapshot', async () => {
  const fixture = await criarRedacao()
  const args = { redacaoId: fixture.redacao.id, professorId: professor.id, modelo: 'fixture-b35', versaoPrompt: 'fixture-v1', iniciadaEm: new Date() }
  const resultados = await Promise.all([iniciarAnaliseIa(args), iniciarAnaliseIa(args)])
  assert.deepEqual(resultados.map((r) => r.status).sort(), ['ANALISE_EM_ANDAMENTO', 'ANALISE_INICIADA'])
  const iniciada = resultados.find((r) => r.analise)
  assert.deepEqual(iniciada.analise.criteriosSnapshot.map((c) => c.nome), fixture.tema.criterios.map((c) => c.nome))
  assert.equal(await prisma.analiseIA.count({ where: { redacaoId: fixture.redacao.id } }), 1)
  assert.equal(await prisma.feedback.count({ where: { redacaoId: fixture.redacao.id } }), 0)
  await falharAnaliseIa({ analiseId: iniciada.analise.id, mensagemErro: 'FIXTURE_B35', duracaoMs: 1, concluidaEm: new Date() })
  assert.equal((await iniciarAnaliseIa({ ...args, professorId: outroProfessor.id })).status, 'REDACAO_INDISPONIVEL')
})

test('erro inesperado do provedor preserva análise anterior, redação e ausência de nota automática', async () => {
  const fixture = await criarRedacao()
  const resposta = {
    resumoGeral: 'Fixture consultiva.', pontosFortes: [], pontosDeAtencao: [],
    analisePorCriterio: fixture.tema.criterios.map((c) => ({ ordem: c.ordem, criterio: c.nome, diagnostico: 'Diagnóstico fictício.', evidencias: [], orientacaoAoProfessor: 'Revisar.' })),
    observacoesFinais: 'Sem nota automática.',
  }
  const anterior = await solicitarAnaliseIaParaProfessor({ redacaoId: fixture.redacao.id, professorId: professor.id }, { gerar: async () => ({ texto: JSON.stringify(resposta) }) })
  await assert.rejects(solicitarAnaliseIaParaProfessor({ redacaoId: fixture.redacao.id, professorId: professor.id }, { gerar: async () => { throw new Error('segredo-sintetico-B35') } }))
  const analises = await prisma.analiseIA.findMany({ where: { redacaoId: fixture.redacao.id } })
  assert.equal(analises.length, 2)
  assert.equal(analises.find((a) => a.id === anterior.id).status, 'CONCLUIDA')
  assert.equal(analises.find((a) => a.status === 'ERRO').mensagemErro, 'UNEXPECTED_AI_ANALYSIS_ERROR')
  assert.doesNotMatch(JSON.stringify(analises), /segredo-sintetico/)
  assert.equal(await prisma.feedback.count({ where: { redacaoId: fixture.redacao.id } }), 0)
  const preservada = await prisma.redacao.findUnique({ where: { id: fixture.redacao.id } })
  assert.equal(preservada.status, 'ENVIADA')
  assert.equal(preservada.texto, fixture.texto)
})

test('falhas OCR/LanguageTool preservam o rascunho e acesso indevido não chama OCR', async () => {
  const fixture = await criarRedacao({ enviar: false })
  const original = globalThis.fetch
  let chamadas = 0
  globalThis.fetch = async () => { chamadas += 1; throw new Error('fixture-falha-externa') }
  try {
    const arquivo = { buffer: Buffer.from([0xff, 0xd8, 0xff]), mimetype: 'image/jpeg' }
    await assert.rejects(transcreverImagemParaAluno({ temaId: fixture.tema.id, alunoId: outroAluno.id, arquivo }), { code: 'ESSAY_TOPIC_NOT_FOUND' })
    assert.equal(chamadas, 0)
    await assert.rejects(transcreverImagemParaAluno({ temaId: fixture.tema.id, alunoId: aluno.id, arquivo }))
    assert.equal(chamadas, 1)
  } finally {
    globalThis.fetch = original
  }
  const revisao = await revisarLinguagemParaAluno({ temaId: fixture.tema.id, alunoId: aluno.id, texto: fixture.texto }, { revisar: async () => { throw new Error('fixture-falha') } })
  assert.equal(revisao.status, 'INDISPONIVEL')
  const salva = await prisma.redacao.findUnique({ where: { id: fixture.redacao.id } })
  assert.equal(salva.texto, fixture.texto)
  assert.equal(salva.status, 'RASCUNHO')
  assert.equal(salva.origemTexto, 'DIGITADO')
  assert.equal(salva.ocrRevisadoEm, null)
  await request(app).post(`/api/aluno/temas/${fixture.tema.id}/redacao/enviar`).set('Authorization', auth(aluno)).expect(200)
})
