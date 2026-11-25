import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'

const { app } = await import('../../src/app.js')
const { env } = await import('../../src/config/env.js')
const { prisma } = await import('../../src/config/prisma.js')
const { criarAccessToken } = await import('../../src/modules/auth/auth-token.service.js')
const { obterModeloCompetenciaDois } = await import('../../src/modules/temas/temas.competencia-dois.js')
const usuarios = []
let professor, outroProfessor, aluno, outroAluno, turma, confirmado = false
const texto = '📚 A Constituição garante a educação. A referência sustenta o argumento.'
const auth = usuario => `Bearer ${criarAccessToken({ usuarioId: usuario.id, papel: usuario.papel })}`

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  assert.equal(url.pathname, '/lexis_test')
  assert.equal((await prisma.$queryRaw`SELECT DATABASE() AS banco`)[0].banco, 'lexis_test')
  confirmado = true
  for (const papel of ['PROFESSOR', 'PROFESSOR', 'ALUNO', 'ALUNO']) {
    usuarios.push(await prisma.usuario.create({ data: {
      nome: 'Fixture trechos 42', email: `trechos.${randomUUID()}@lexis.example.com`, papel,
      senhaHash: 'fixture-sem-login-por-senha',
    } }))
  }
  ;[professor, outroProfessor, aluno, outroAluno] = usuarios
  turma = await prisma.turma.create({ data: { nome: 'Trechos fictícios 42', codigoAcesso: randomUUID(), professorId: professor.id } })
})

after(async () => {
  if (confirmado && usuarios.length) {
    const ids = usuarios.map(u => u.id)
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: ids } } })
    await prisma.feedbackVersao.deleteMany({ where: { professorId: { in: ids } } })
    await prisma.feedback.deleteMany({ where: { redacao: { alunoId: { in: ids } } } })
    await prisma.analiseIA.deleteMany({ where: { solicitadaPorId: { in: ids } } })
    await prisma.redacao.deleteMany({ where: { alunoId: { in: ids } } })
    if (turma) await prisma.temaRedacao.deleteMany({ where: { turmaId: turma.id } })
    if (turma) await prisma.turma.delete({ where: { id: turma.id } })
    await prisma.usuario.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.$disconnect()
})

// Uma redação por aluno/tema; cada teste cria proposta própria para manter isolamento.
async function fixture() {
  const proposta = await prisma.temaRedacao.create({ data: {
    turmaId: turma.id, enunciado: `Fixture ${randomUUID()}`, descricao: 'Proposta fictícia para regressão 42.', prazoEntrega: new Date(Date.now() + 86400000),
    criterios: { create: obterModeloCompetenciaDois().criterios.map((c, i) => ({ ...c, ordem: i + 1 })) },
  }, include: { criterios: { orderBy: { ordem: 'asc' } } } })
  const redacao = await prisma.redacao.create({ data: { alunoId: aluno.id, temaId: proposta.id, texto, status: 'ENVIADA', enviadaEm: new Date() } })
  return { proposta, redacao, raiz: `/api/redacoes/${redacao.id}/feedback` }
}
function trecho(inicio = texto.indexOf('Constituição'), fim = inicio + 'Constituição'.length) {
  return { inicio, fim, trecho: texto.slice(inicio, fim) }
}
function body(f, trechos) {
  return { competencia1: 160, competencia2: 160, competencia3: 160, competencia4: 160, competencia5: 160,
    comentarioGeral: 'Revisão humana fictícia.', criterios: f.proposta.criterios.map((c, i) => ({
      criterioId: c.id, comentario: `Comentário humano ${i}.`, ...(i === 0 && trechos !== undefined ? { trechos } : {}),
    })) }
}
const salvar = (f, dados, usuario = professor) => request(app).put(f.raiz).set('Authorization', auth(usuario)).send(dados)
const publicar = (f, usuario = professor) => request(app).post(`${f.raiz}/publicar`).set('Authorization', auth(usuario))
const consultarAluno = (f, usuario = aluno) => request(app).get(`/api/aluno/redacoes/${f.redacao.id}/feedback`).set('Authorization', auth(usuario))
const consultarProfessor = f => request(app).get(f.raiz).set('Authorization', auth(professor))
const notificacoesDaRedacao = f => prisma.notificacao.findMany({
  where: { feedbackVersao: { feedback: { redacaoId: f.redacao.id } } },
  orderBy: { id: 'asc' },
})
async function analise(f, overrides = {}) {
  return prisma.analiseIA.create({ data: {
    redacaoId: f.redacao.id, solicitadaPorId: professor.id, status: 'CONCLUIDA', modelo: 'fixture-sem-provedor', versaoPrompt: 'fixture-42',
    criteriosSnapshot: f.proposta.criterios.map(c => ({ id: c.id, nome: c.nome, ordem: c.ordem })),
    resultadoEstruturado: { resumoGeral: 'DIAGNOSTICO_PRIVADO_42', analisePorCriterio: f.proposta.criterios.map(c => ({
      ordem: c.ordem, criterio: c.nome, diagnostico: 'DIAGNOSTICO_PRIVADO_42', evidencias: [{ ...trecho(), statusLocalizacao: 'LOCALIZADA' }],
    })) }, ...overrides,
  } })
}

test('trechos manuais só chegam ao aluno após publicação, com sobreposição e isolamento', async () => {
  const f = await fixture()
  const dados = body(f, [trecho(), trecho(3, 35)])
  dados.criterios[1].trechos = [trecho()]
  const salvo = await salvar(f, dados).expect(200)
  assert.equal(salvo.body.data.feedback.criterios[0].trechos.length, 2)
  await consultarAluno(f).expect(404)
  await salvar(f, dados, outroProfessor).expect(404)
  await salvar(f, dados, aluno).expect(403)
  await publicar(f).expect(200)
  const publicado = (await consultarAluno(f).expect(200)).body.data.feedback
  assert.equal(publicado.criterios[0].trechos.length, 2)
  assert.equal(publicado.criterios[1].trechos.length, 1)
  for (const c of publicado.criterios) for (const t of c.trechos) {
    assert.equal(texto.slice(t.inicio, t.fim), t.trecho)
    assert.equal(t.sugeridoPorIa, false)
    assert.equal('analiseIaId' in t, false)
  }
  await consultarAluno(f, outroAluno).expect(404)
})

test('origem IA é derivada da análise desta redação e critério; bordas editadas viram autoria humana', async () => {
  const f = await fixture(), a = await analise(f)
  const dados = body(f, [{ ...trecho(), analiseIaId: a.id }, { ...trecho(3, 35), analiseIaId: a.id }])
  const salvo = (await salvar(f, dados).expect(200)).body.data.feedback.criterios[0].trechos
  assert.equal(salvo.find(t => t.inicio === trecho().inicio).sugeridoPorIa, true)
  assert.equal(salvo.find(t => t.inicio === trecho().inicio).analiseIaId, a.id)
  assert.equal(salvo.find(t => t.inicio === 3).sugeridoPorIa, false)
  assert.equal(salvo.find(t => t.inicio === 3).analiseIaId, null)
  await publicar(f).expect(200)
  const resposta = await consultarAluno(f).expect(200)
  assert.equal(resposta.body.data.feedback.criterios[0].trechos.find(t => t.inicio === trecho().inicio).sugeridoPorIa, true)
  assert.doesNotMatch(JSON.stringify(resposta.body), /DIAGNOSTICO_PRIVADO_42|resultadoEstruturado|analiseIaId|criteriosSnapshot/)
})

test('omissão preserva trechos no rascunho e na nova versão; lista vazia remove sem alterar versão publicada', async () => {
  const f = await fixture()
  await salvar(f, body(f, [trecho()])).expect(200)
  assert.equal((await salvar(f, body(f)).expect(200)).body.data.feedback.criterios[0].trechos.length, 1)
  const v1 = (await publicar(f).expect(200)).body.data.feedback
  const v2 = (await salvar(f, body(f)).expect(200)).body.data.feedback
  assert.equal(v2.numero, 2)
  assert.equal(v2.criterios[0].trechos.length, 1)
  await salvar(f, body(f, [])).expect(200)
  assert.equal((await consultarAluno(f).expect(200)).body.data.feedback.criterios[0].trechos.length, 1)
  await publicar(f).expect(200)
  assert.equal((await consultarAluno(f).expect(200)).body.data.feedback.criterios[0].trechos.length, 0)
  const historico = (await request(app).get(f.raiz).set('Authorization', auth(professor)).expect(200)).body.data.feedback.historico
  assert.equal(historico[1].id, v1.id)
  assert.equal(historico[1].status, 'SUBSTITUIDA')
  assert.equal(historico[1].criterios[0].trechos.length, 1)
})

test('offsets divergentes e referências de análise indisponíveis são rejeitados sem modificar o rascunho', async () => {
  const f = await fixture(), outra = await fixture(), estrangeira = await analise(outra)
  const correta = await analise(f), falha = await analise(f, { status: 'ERRO' })
  await salvar(f, body(f, [trecho()])).expect(200)
  const antes = (await request(app).get(f.raiz).set('Authorization', auth(professor)).expect(200)).body.data.feedback
  for (const t of [{ ...trecho(), trecho: 'inventado' }, trecho(0, texto.length + 1), trecho(0, 1)]) {
    const r = await salvar(f, body(f, [t])).expect(422)
    assert.equal(r.body.error.code, 'FEEDBACK_EVIDENCE_INVALID')
  }
  for (const id of [estrangeira.id, randomUUID(), falha.id]) {
    const r = await salvar(f, body(f, [{ ...trecho(), analiseIaId: id }])).expect(422)
    assert.equal(r.body.error.code, 'FEEDBACK_ANALYSIS_INVALID')
  }
  const depois = (await request(app).get(f.raiz).set('Authorization', auth(professor)).expect(200)).body.data.feedback
  assert.deepEqual(depois, antes)
  // Uma análise concluída sem evidência deste critério não confere origem IA.
  await prisma.analiseIA.update({ where: { id: correta.id }, data: { resultadoEstruturado: { analisePorCriterio: [] } } })
  const r = await salvar(f, body(f, [{ ...trecho(), analiseIaId: correta.id }])).expect(200)
  assert.equal(r.body.data.feedback.criterios[0].trechos[0].sugeridoPorIa, false)
})

test('publicação recusa corrupção literal do rascunho e mantém a publicação anterior', async () => {
  const f = await fixture()
  await salvar(f, body(f, [trecho()])).expect(200)
  const anterior = (await publicar(f).expect(200)).body.data.feedback
  const novo = (await salvar(f, body(f)).expect(200)).body.data.feedback
  const id = novo.criterios[0].trechos[0].id
  await prisma.feedbackCriterioTrecho.update({ where: { id }, data: { trecho: 'fixture inválida' } })
  const r = await publicar(f).expect(422)
  assert.equal(r.body.error.code, 'FEEDBACK_EVIDENCE_INVALID')
  assert.equal((await consultarAluno(f).expect(200)).body.data.feedback.id, anterior.id)
  assert.equal(await prisma.notificacao.count({ where: { feedbackVersao: { feedback: { redacaoId: f.redacao.id } } } }), 1)
})

test('contrato recusa booleano de origem, duplicatas, limites e campos extras, mas aceita cliente legado', async () => {
  const f = await fixture()
  for (const trechos of [[{ ...trecho(), sugeridoPorIa: true }], [trecho(), trecho()], Array(21).fill(trecho()), [{ ...trecho(), analiseIaId: 'não-uuid' }]]) {
    await salvar(f, body(f, trechos)).expect(422)
  }
  await salvar(f, body(f)).expect(200)
  assert.equal((await publicar(f).expect(200)).body.data.feedback.criterios[0].trechos.length, 0)
})

test('comentário removido não ressuscita trechos antigos ao ser reincluído no mesmo rascunho', async () => {
  const f = await fixture()
  await salvar(f, body(f, [trecho()])).expect(200)
  await publicar(f).expect(200)
  const removido = body(f)
  removido.criterios.shift()
  await salvar(f, removido).expect(200)
  const reincluido = (await salvar(f, body(f)).expect(200)).body.data.feedback
  assert.equal(reincluido.criterios[0].trechos.length, 0)
})

test('publicação concorrente mantém uma única versão com trechos e uma única notificação', async () => {
  const f = await fixture()
  await salvar(f, body(f, [trecho()])).expect(200)
  const respostas = await Promise.all([publicar(f), publicar(f)])
  assert.deepEqual(respostas.map(r => r.status).sort(), [200, 409])
  const r = (await consultarAluno(f).expect(200)).body.data.feedback
  assert.equal(r.criterios[0].trechos.length, 1)
  assert.equal(await prisma.notificacao.count({ where: { feedbackVersaoId: r.id } }), 1)
})

test('UX-040: recusa republicação idêntica sem alterar rascunho, histórico ou fila de e-mail', async () => {
  const f = await fixture()
  const dados = body(f, [trecho()])
  await salvar(f, dados).expect(200)
  const publicada = (await publicar(f).expect(200)).body.data.feedback
  const semRascunho = await publicar(f).expect(409)
  assert.equal(semRascunho.body.error.code, 'FEEDBACK_DRAFT_REQUIRED')

  const rascunho = (await salvar(f, dados).expect(200)).body.data.feedback
  const antes = (await consultarProfessor(f).expect(200)).body.data.feedback
  const avisos = await notificacoesDaRedacao(f)
  assert.equal(avisos.length, 1)
  assert.equal(avisos[0].statusEmail, 'PENDENTE')
  assert.equal(avisos[0].feedbackVersaoId, publicada.id)
  assert.equal((await publicar(f, outroProfessor).expect(404)).body.error.code, 'ESSAY_NOT_FOUND')
  await publicar(f, aluno).expect(403)

  const recusada = await publicar(f).expect(409)
  assert.equal(recusada.body.error.code, 'FEEDBACK_UNCHANGED')
  assert.match(recusada.body.error.message, /idêntico à versão publicada/)
  const depois = (await consultarProfessor(f).expect(200)).body.data.feedback
  assert.deepEqual(depois, antes)
  assert.deepEqual(depois.historico.map(v => [v.id, v.status]), [
    [rascunho.id, 'RASCUNHO'], [publicada.id, 'PUBLICADA'],
  ])
  assert.equal((await consultarAluno(f).expect(200)).body.data.feedback.id, publicada.id)
  assert.deepEqual(await notificacoesDaRedacao(f), avisos)

  dados.comentarioGeral += '!'
  const alterado = (await salvar(f, dados).expect(200)).body.data.feedback
  assert.equal(alterado.id, rascunho.id)
  assert.equal((await publicar(f).expect(200)).body.data.feedback.id, rascunho.id)
  assert.equal((await consultarAluno(f).expect(200)).body.data.feedback.comentarioGeral, dados.comentarioGeral)
  assert.equal((await notificacoesDaRedacao(f)).length, 2)
})

test('UX-040: reordenação e alterações só na origem por IA não justificam republicação', async () => {
  const f = await fixture()
  const a = await analise(f), b = await analise(f)
  const dados = body(f, [
    { ...trecho(), analiseIaId: a.id },
    trecho(3, 35),
  ])
  dados.criterios[1].trechos = [{ ...trecho(), analiseIaId: a.id }]
  await salvar(f, dados).expect(200)
  await publicar(f).expect(200)
  const reenviado = body(f, [trecho(3, 35), { ...trecho(), analiseIaId: b.id }])
  reenviado.criterios[1].trechos = [trecho()]
  reenviado.criterios.reverse()
  const rascunho = (await salvar(f, reenviado).expect(200)).body.data.feedback
  const criterio0 = rascunho.criterios.find(c => c.criterioId === f.proposta.criterios[0].id)
  const criterio1 = rascunho.criterios.find(c => c.criterioId === f.proposta.criterios[1].id)
  assert.equal(criterio0.trechos.find(t => t.inicio === trecho().inicio).analiseIaId, b.id)
  assert.equal(criterio1.trechos[0].sugeridoPorIa, false)
  assert.equal((await publicar(f).expect(409)).body.error.code, 'FEEDBACK_UNCHANGED')
  assert.equal((await notificacoesDaRedacao(f)).length, 1)
})

for (const [campo, editar] of [
  ['nota', (dados) => { dados.competencia1 += 1 }],
  ['comentário de critério', (dados) => { dados.criterios[0].comentario += '!' }],
  ['conjunto de critérios', (dados) => { dados.criterios.pop() }],
  ['borda de trecho', (dados) => { dados.criterios[0].trechos = [trecho(trecho().inicio, trecho().fim + 1)] }],
]) {
  test(`UX-040: permite republicar com uma alteração em ${campo}`, async () => {
    const f = await fixture()
    const dados = body(f, [trecho()])
    await salvar(f, dados).expect(200)
    await publicar(f).expect(200)
    editar(dados)
    await salvar(f, dados).expect(200)
    assert.equal((await publicar(f).expect(200)).body.data.feedback.numero, 2)
    const historico = (await consultarProfessor(f).expect(200)).body.data.feedback.historico
    assert.deepEqual(historico.map(v => v.status), ['PUBLICADA', 'SUBSTITUIDA'])
    assert.equal((await notificacoesDaRedacao(f)).length, 2)
  })
}

test('UX-040: compara apenas com a publicação vigente, não com uma versão substituída', async () => {
  const f = await fixture()
  const dados = body(f, [trecho()])
  for (const comentarioGeral of ['Versão fictícia A.', 'Versão fictícia B.', 'Versão fictícia A.']) {
    await salvar(f, { ...dados, comentarioGeral }).expect(200)
    await publicar(f).expect(200)
  }
  const { historico } = (await consultarProfessor(f).expect(200)).body.data.feedback
  assert.deepEqual(historico.map(v => [v.numero, v.status]), [
    [3, 'PUBLICADA'], [2, 'SUBSTITUIDA'], [1, 'SUBSTITUIDA'],
  ])
  assert.equal((await notificacoesDaRedacao(f)).length, 3)
})

test('UX-040: POSTs concorrentes bloqueiam o rascunho idêntico e publicam uma única vez após edição', async () => {
  const f = await fixture()
  const dados = body(f, [trecho()])
  await salvar(f, dados).expect(200)
  await publicar(f).expect(200)
  await salvar(f, dados).expect(200)
  const iguais = await Promise.all([publicar(f), publicar(f)])
  assert.deepEqual(iguais.map(r => [r.status, r.body.error?.code]), [
    [409, 'FEEDBACK_UNCHANGED'], [409, 'FEEDBACK_UNCHANGED'],
  ])
  assert.equal((await notificacoesDaRedacao(f)).length, 1)

  dados.comentarioGeral += '!'
  await salvar(f, dados).expect(200)
  const diferentes = await Promise.all([publicar(f), publicar(f)])
  assert.deepEqual(diferentes.map(r => r.status).sort(), [200, 409])
  assert.equal(diferentes.find(r => r.status === 409).body.error.code, 'FEEDBACK_DRAFT_REQUIRED')
  const { historico } = (await consultarProfessor(f).expect(200)).body.data.feedback
  assert.deepEqual(historico.map(v => [v.numero, v.status]), [[2, 'PUBLICADA'], [1, 'SUBSTITUIDA']])
  assert.equal((await notificacoesDaRedacao(f)).length, 2)
})
