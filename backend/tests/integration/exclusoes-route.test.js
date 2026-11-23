import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { app } from '../../src/app.js'
import { env } from '../../src/config/env.js'
import { prisma } from '../../src/config/prisma.js'
import { autenticarUsuario, cadastrarUsuario } from '../../src/modules/auth/auth.service.js'
import { criarHashToken } from '../../src/modules/auth/auth-token.service.js'
import { obterModeloCompetenciaDois } from '../../src/modules/temas/temas.competencia-dois.js'
import { criarMatriculaAtivaComExclusividade, criarTurma } from '../../src/modules/turmas/turmas.repository.js'

const senha = 'SenhaFicticiaExclusoes123!'
const usuarios = []
const turmas = []
const temas = []
const redacoes = []
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
    if (!confirmado) return
    await prisma.notificacao.deleteMany({ where: { usuarioId: { in: usuarios } } })
    await prisma.feedbackVersao.deleteMany({ where: { feedback: { redacaoId: { in: redacoes } } } })
    await prisma.feedback.deleteMany({ where: { redacaoId: { in: redacoes } } })
    await prisma.redacao.deleteMany({ where: { id: { in: redacoes } } })
    await prisma.matricula.deleteMany({ where: { turmaId: { in: turmas } } })
    await prisma.temaRedacao.deleteMany({ where: { id: { in: temas } } })
    await prisma.turma.deleteMany({ where: { id: { in: turmas } } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } })
  } finally {
    await prisma.$disconnect()
  }
})

async function conta(papel) {
  const usuario = await cadastrarUsuario({ nome: 'Pessoa Fictícia', email: `exclusao.${randomUUID()}@lexis.example.com`, senha, papel })
  usuarios.push(usuario.id)
  const sessao = await autenticarUsuario({ email: usuario.email, senha })
  return { ...usuario, sessao }
}

const auth = usuario => ({ Authorization: `Bearer ${usuario.sessao.accessToken}` })
const removerConta = (usuario, dados = { senhaAtual: senha }) =>
  request(app).delete('/api/auth/me').set(auth(usuario)).send(dados)

async function turmaDo(professor, ativa = true) {
  const turma = await prisma.turma.create({ data: {
    professorId: professor.id, nome: 'Turma de teste', codigoAcesso: randomUUID(), ativa,
  } })
  turmas.push(turma.id)
  return turma
}

async function temaDa(turma, ativo = true) {
  const tema = await prisma.temaRedacao.create({ data: {
    turmaId: turma.id, enunciado: 'Proposta fictícia de teste', descricao: 'Descrição fictícia.',
    prazoEntrega: new Date(Date.now() + 3_600_000), ativo,
    criterios: { create: obterModeloCompetenciaDois().criterios.map((criterio, indice) => ({ ...criterio, ordem: indice + 1 })) },
  } })
  temas.push(tema.id)
  return tema
}

async function redacaoDo(aluno, tema, status) {
  const redacao = await prisma.redacao.create({ data: { alunoId: aluno.id, temaId: tema.id, status, texto: 'Uma redação fictícia.' } })
  redacoes.push(redacao.id)
  return redacao
}

test('exclusão de conta exige sessão e senha atual e não aceita ID indicado pelo cliente', async () => {
  const aluno = await conta('ALUNO')
  const antes = await prisma.usuario.findUnique({ where: { id: aluno.id } })
  await request(app).delete('/api/auth/me').send({ senhaAtual: senha }).expect(401)
  await removerConta(aluno, { senhaAtual: senha, usuarioId: randomUUID() }).expect(422)
  const erro = await removerConta(aluno, { senhaAtual: 'Senha incorreta' }).expect(422)
  assert.equal(erro.body.error.code, 'CURRENT_PASSWORD_INVALID')
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: aluno.id } }), antes)
  await request(app).get('/api/auth/me').set(auth(aluno)).expect(200)
})

test('exclusão do aluno remove identificação e credenciais e preserva redação, correção e matrícula', async () => {
  const professor = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const outraSessao = await autenticarUsuario({ email: aluno.email, senha })
  const turma = await turmaDo(professor)
  const tema = await temaDa(turma)
  const redacao = await redacaoDo(aluno, tema, 'AVALIADA')
  const feedback = await prisma.feedback.create({ data: { redacaoId: redacao.id } })
  const versao = await prisma.feedbackVersao.create({ data: {
    feedbackId: feedback.id, professorId: professor.id, numero: 1, status: 'PUBLICADA', comentarioGeral: 'Correção fictícia.',
  } })
  const aviso = await prisma.notificacao.create({ data: {
    usuarioId: aluno.id, feedbackVersaoId: versao.id, tipo: 'FEEDBACK_PUBLICADO',
    titulo: 'Correção', mensagem: 'Correção disponível.', emailDestino: aluno.email,
  } })
  const matricula = await prisma.matricula.create({ data: { alunoId: aluno.id, turmaId: turma.id } })
  const token = randomUUID().replaceAll('-', '').repeat(2)
  await prisma.recuperacaoSenha.create({ data: {
    usuarioId: aluno.id, tokenHash: criarHashToken(token), statusEmail: 'ENVIADO',
    expiraEm: new Date(Date.now() + 3_600_000),
  } })

  const resposta = await removerConta(aluno).expect(204)
  assert.match(resposta.headers['set-cookie'][0], /^lexis_refresh_token=;/)
  const excluido = await prisma.usuario.findUnique({ where: { id: aluno.id } })
  assert.equal(excluido.ativo, false)
  assert.equal(excluido.nome, 'Conta excluída')
  assert.match(excluido.email, /@conta-excluida\.invalid$/)
  assert.ok(excluido.desativadoEm)
  for (const sessao of [aluno.sessao, outraSessao]) {
    await request(app).get('/api/auth/me').set(auth({ sessao })).expect(401)
    await request(app).post('/api/auth/refresh').set('Cookie', `lexis_refresh_token=${sessao.refreshToken}`).expect(401)
  }
  await request(app).post('/api/auth/login').send({ email: aluno.email, senha }).expect(401)
  await request(app).post('/api/auth/redefinir-senha').send({ token, senha }).expect(422)
  assert.equal(await prisma.recuperacaoSenha.count({ where: { usuarioId: aluno.id } }), 0)
  assert.equal(await prisma.refreshToken.count({ where: { usuarioId: aluno.id } }), 0)
  assert.equal((await prisma.notificacao.findUnique({ where: { id: aviso.id } })).emailDestino, null)
  assert.equal((await prisma.matricula.findUnique({ where: { id: matricula.id } })).status, 'ENCERRADA')
  assert.deepEqual(await prisma.redacao.findUnique({ where: { id: redacao.id } }), redacao)
  assert.deepEqual(await prisma.feedbackVersao.findUnique({ where: { id: versao.id } }), versao)
})

test('professor deve arquivar todas as turmas; exclusão preserva turma, proposta e autoria da correção', async () => {
  const professor = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const turma = await turmaDo(professor)
  const tema = await temaDa(turma)
  const redacao = await redacaoDo(aluno, tema, 'AVALIADA')
  const feedback = await prisma.feedback.create({ data: { redacaoId: redacao.id } })
  const versao = await prisma.feedbackVersao.create({ data: {
    feedbackId: feedback.id, professorId: professor.id, numero: 1, status: 'PUBLICADA',
  } })
  const antes = await prisma.usuario.findUnique({ where: { id: professor.id } })
  const erro = await removerConta(professor).expect(409)
  assert.equal(erro.body.error.code, 'ACCOUNT_HAS_ACTIVE_CLASSES')
  assert.deepEqual(await prisma.usuario.findUnique({ where: { id: professor.id } }), antes)
  await request(app).post(`/api/turmas/${turma.id}/arquivar`).set(auth(professor)).expect(200)
  await removerConta(professor).expect(204)
  await request(app).get('/api/auth/me').set(auth(professor)).expect(401)
  const historico = await prisma.turma.findUnique({ where: { id: turma.id }, include: { professor: true, temas: true } })
  assert.equal(historico.ativa, false)
  assert.equal(historico.professorId, professor.id)
  assert.equal(historico.professor.nome, 'Conta excluída')
  assert.equal(historico.temas[0].id, tema.id)
  assert.deepEqual(await prisma.feedbackVersao.findUnique({ where: { id: versao.id } }), versao)
})

test('exclui só turma própria, arquivada e sem histórico', async () => {
  const professor = await conta('PROFESSOR')
  const outro = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const turma = await turmaDo(professor, false)
  const url = `/api/turmas/${turma.id}`
  await request(app).delete(url).expect(401)
  await request(app).delete(url).set(auth(aluno)).expect(403)
  await request(app).delete(url).set(auth(outro)).expect(404)
  await request(app).delete('/api/turmas/invalido').set(auth(professor)).expect(422)
  await request(app).get(url).set(auth(outro)).expect(404)
  const detalhe = await request(app).get(url).set(auth(professor)).expect(200)
  assert.equal(detalhe.body.data.turma.podeExcluirDefinitivamente, true)
  await request(app).delete(url).set(auth(professor)).expect(204)
  await request(app).delete(url).set(auth(professor)).expect(404)
  assert.equal(await prisma.turma.findUnique({ where: { id: turma.id } }), null)
})

test('turma e proposta ativas sem histórico só são elegíveis após arquivamento', async () => {
  const professor = await conta('PROFESSOR')
  const turma = await turmaDo(professor)
  const url = `/api/turmas/${turma.id}`
  const ativa = await request(app).get(url).set(auth(professor)).expect(200)
  assert.equal(ativa.body.data.turma.podeExcluirDefinitivamente, false)
  const turmaBloqueada = await request(app).delete(url).set(auth(professor)).expect(409)
  assert.equal(turmaBloqueada.body.error.code, 'CLASS_NOT_ARCHIVED')
  const tema = await temaDa(turma)
  const urlTema = `/api/temas/${tema.id}`
  const temaBloqueado = await request(app).delete(urlTema).set(auth(professor)).expect(409)
  assert.equal(temaBloqueado.body.error.code, 'ESSAY_TOPIC_NOT_ARCHIVED')
  await request(app).post(`${urlTema}/arquivar`).set(auth(professor)).expect(200)
  await request(app).delete(urlTema).set(auth(professor)).expect(204)
  await request(app).post(`${url}/arquivar`).set(auth(professor)).expect(200)
  const arquivada = await request(app).get(url).set(auth(professor)).expect(200)
  assert.equal(arquivada.body.data.turma.podeExcluirDefinitivamente, true)
  await request(app).delete(url).set(auth(professor)).expect(204)
})

test('exclusões concorrentes de uma turma vazia têm apenas um sucesso', async () => {
  const professor = await conta('PROFESSOR')
  const turma = await turmaDo(professor, false)
  const excluir = () => request(app).delete(`/api/turmas/${turma.id}`).set(auth(professor))
  const respostas = await Promise.all([excluir(), excluir()])
  assert.deepEqual(respostas.map(resposta => resposta.status).sort(), [204, 404])
  assert.equal(await prisma.turma.findUnique({ where: { id: turma.id } }), null)
})

test('matrícula encerrada ou proposta arquivada impedem excluir turma', async () => {
  const professor = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const turmaMatricula = await turmaDo(professor, false)
  const turmaProposta = await turmaDo(professor, false)
  const matricula = await prisma.matricula.create({ data: { alunoId: aluno.id, turmaId: turmaMatricula.id, status: 'ENCERRADA' } })
  const tema = await temaDa(turmaProposta, false)
  for (const turma of [turmaMatricula, turmaProposta]) {
    const detalhe = await request(app).get(`/api/turmas/${turma.id}`).set(auth(professor)).expect(200)
    assert.equal(detalhe.body.data.turma.podeExcluirDefinitivamente, false)
    const resposta = await request(app).delete(`/api/turmas/${turma.id}`).set(auth(professor)).expect(409)
    assert.equal(resposta.body.error.code, 'CLASS_HAS_HISTORY')
    assert.deepEqual(await prisma.turma.findUnique({ where: { id: turma.id } }), turma)
  }
  assert.deepEqual(await prisma.matricula.findUnique({ where: { id: matricula.id } }), matricula)
  assert.deepEqual(await prisma.temaRedacao.findUnique({ where: { id: tema.id } }), tema)
})

test('exclui apenas proposta própria sem redação e remove seus critérios de configuração', async () => {
  const professor = await conta('PROFESSOR')
  const outro = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const turma = await turmaDo(professor)
  const tema = await temaDa(turma, false)
  const url = `/api/temas/${tema.id}`
  await request(app).delete(url).expect(401)
  await request(app).delete(url).set(auth(aluno)).expect(403)
  await request(app).delete(url).set(auth(outro)).expect(404)
  await request(app).delete('/api/temas/invalido').set(auth(professor)).expect(422)
  assert.equal(await prisma.criterioAvaliacao.count({ where: { temaId: tema.id } }), 3)
  await request(app).delete(url).set(auth(professor)).expect(204)
  await request(app).delete(url).set(auth(professor)).expect(404)
  assert.equal(await prisma.temaRedacao.findUnique({ where: { id: tema.id } }), null)
  assert.equal(await prisma.criterioAvaliacao.count({ where: { temaId: tema.id } }), 0)
  assert.deepEqual(await prisma.turma.findUnique({ where: { id: turma.id } }), turma)
})

test('rascunho ou redação enviada bloqueiam a exclusão da proposta sem alterar os dados', async () => {
  const professor = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const turma = await turmaDo(professor)
  for (const status of ['RASCUNHO', 'ENVIADA']) {
    const tema = await temaDa(turma, false)
    const redacao = await redacaoDo(aluno, tema, status)
    const resposta = await request(app).delete(`/api/temas/${tema.id}`).set(auth(professor)).expect(409)
    assert.equal(resposta.body.error.code, 'ESSAY_TOPIC_HAS_HISTORY')
    assert.deepEqual(await prisma.temaRedacao.findUnique({ where: { id: tema.id } }), tema)
    assert.deepEqual(await prisma.redacao.findUnique({ where: { id: redacao.id } }), redacao)
    assert.equal(await prisma.criterioAvaliacao.count({ where: { temaId: tema.id } }), 3)
  }
})

test('exclusões concorrentes de uma proposta vazia não deixam critérios órfãos', async () => {
  const professor = await conta('PROFESSOR')
  const tema = await temaDa(await turmaDo(professor), false)
  const excluir = () => request(app).delete(`/api/temas/${tema.id}`).set(auth(professor))
  const respostas = await Promise.all([excluir(), excluir()])
  assert.deepEqual(respostas.map(resposta => resposta.status).sort(), [204, 404])
  assert.equal(await prisma.temaRedacao.findUnique({ where: { id: tema.id } }), null)
  assert.equal(await prisma.criterioAvaliacao.count({ where: { temaId: tema.id } }), 0)
})

test('professor pode corrigir uma entrega histórica sem criar destino de e-mail para a conta excluída', async () => {
  const professor = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const tema = await temaDa(await turmaDo(professor))
  const redacao = await redacaoDo(aluno, tema, 'ENVIADA')
  await removerConta(aluno).expect(204)

  const rota = `/api/redacoes/${redacao.id}/feedback`
  await request(app).put(rota).set(auth(professor)).send({
    competencia1: 120, competencia2: 120, competencia3: 120, competencia4: 120, competencia5: 120,
    comentarioGeral: 'Correção da entrega de teste.', criterios: [],
  }).expect(200)
  await request(app).post(`${rota}/publicar`).set(auth(professor)).expect(200)
  const aviso = await prisma.notificacao.findFirstOrThrow({
    where: { usuarioId: aluno.id, tipo: 'FEEDBACK_PUBLICADO', feedbackVersao: { feedback: { redacaoId: redacao.id } } },
  })
  assert.equal(aviso.emailDestino, null)
  assert.equal(aviso.statusEmail, null)
  assert.equal((await prisma.redacao.findUniqueOrThrow({ where: { id: redacao.id } })).texto, redacao.texto)
})

// A primeira transação confirma o vínculo só depois de a exclusão chegar à
// consulta de bloqueio. Todas as escritas e travas são do MySQL real.
async function concorrerComVinculo(t, gravar, iniciarExclusao) {
  const original = prisma.$transaction
  const transacao = original.bind(prisma)
  const vinculoGravado = Promise.withResolvers()
  const confirmarVinculo = Promise.withResolvers()
  const exclusaoNaTrava = Promise.withResolvers()
  t.after(() => { prisma.$transaction = original })

  const vinculo = transacao(async tx => {
    const registro = await gravar(tx)
    vinculoGravado.resolve()
    await confirmarVinculo.promise
    return registro
  }, { timeout: 12000 })
  vinculo.catch(vinculoGravado.reject)

  let exclusao
  try {
    await vinculoGravado.promise
    prisma.$transaction = (callback, options) => transacao(tx => callback(new Proxy(tx, {
      get(target, chave) {
        if (chave !== '$queryRaw') return target[chave]
        return (...args) => {
          exclusaoNaTrava.resolve()
          return target.$queryRaw(...args)
        }
      },
    })), { ...options, timeout: 10000 })
    exclusao = iniciarExclusao().then(resposta => resposta)
    await Promise.race([exclusaoNaTrava.promise, exclusao.then(() => {
      throw new Error('A exclusão terminou antes da tentativa de trava.')
    })])
    confirmarVinculo.resolve()
    return await Promise.all([vinculo, exclusao])
  } finally {
    confirmarVinculo.resolve()
    await Promise.allSettled([vinculo, exclusao])
  }
}

test('vínculo de proposta concorrente vence a exclusão da turma', { timeout: 20000 }, async t => {
  const professor = await conta('PROFESSOR')
  const turma = await turmaDo(professor, false)
  const [tema, resposta] = await concorrerComVinculo(t, async tx => {
    const tema = await tx.temaRedacao.create({ data: {
      turmaId: turma.id, enunciado: 'Proposta concorrente', descricao: 'Descrição fictícia.', prazoEntrega: new Date(),
    } })
    temas.push(tema.id)
    return tema
  }, () => request(app).delete(`/api/turmas/${turma.id}`).set(auth(professor)).expect(409))
  assert.equal(resposta.body.error.code, 'CLASS_HAS_HISTORY')
  assert.deepEqual(await prisma.temaRedacao.findUnique({ where: { id: tema.id } }), tema)
})

test('exclusão que vence a corrida com ingresso impede criar matrícula', { timeout: 20000 }, async t => {
  const professor = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const turma = await turmaDo(professor, false)
  const original = prisma.$transaction
  const transacao = original.bind(prisma)
  t.after(() => { prisma.$transaction = original })
  const removida = Promise.withResolvers()
  const confirmar = Promise.withResolvers()
  const entradaNaTrava = Promise.withResolvers()
  let numero = 0
  prisma.$transaction = (callback, options) => {
    const ordem = ++numero
    return transacao(tx => callback(new Proxy(tx, {
      get(target, chave) {
        if (chave === '$queryRaw' && ordem === 2) {
          return (...args) => {
            if (args[0].join(' ').includes('FROM turmas')) entradaNaTrava.resolve()
            return target.$queryRaw(...args)
          }
        }
        if (chave === 'turma' && ordem === 1) {
          return new Proxy(target.turma, {
            get(modelo, metodo) {
              if (metodo !== 'delete') return modelo[metodo]
              return async (...args) => {
                const resultado = await modelo.delete(...args)
                removida.resolve()
                await confirmar.promise
                return resultado
              }
            },
          })
        }
        return target[chave]
      },
    })), { ...options, timeout: 12000 })
  }

  const exclusao = request(app).delete(`/api/turmas/${turma.id}`).set(auth(professor)).expect(204).then(resposta => resposta)
  let entrada
  try {
    await Promise.race([removida.promise, exclusao.then(() => {
      throw new Error('A exclusão terminou sem passar pela remoção transacional.')
    })])
    entrada = criarMatriculaAtivaComExclusividade({ alunoId: aluno.id, turmaId: turma.id })
    await Promise.race([entradaNaTrava.promise, entrada.then(() => {
      throw new Error('O ingresso terminou sem tentar bloquear a turma.')
    })])
    confirmar.resolve()
    await exclusao
    assert.equal((await entrada).status, 'TURMA_INDISPONIVEL')
    assert.equal(await prisma.matricula.count({ where: { turmaId: turma.id } }), 0)
  } finally {
    confirmar.resolve()
    await Promise.allSettled([exclusao, entrada])
  }
})

test('rascunho concorrente vence a exclusão da proposta', { timeout: 20000 }, async t => {
  const professor = await conta('PROFESSOR')
  const aluno = await conta('ALUNO')
  const tema = await temaDa(await turmaDo(professor), false)
  const [redacao, resposta] = await concorrerComVinculo(t, async tx => {
    const redacao = await tx.redacao.create({ data: { alunoId: aluno.id, temaId: tema.id, texto: 'Rascunho concorrente.' } })
    redacoes.push(redacao.id)
    return redacao
  }, () => request(app).delete(`/api/temas/${tema.id}`).set(auth(professor)).expect(409))
  assert.equal(resposta.body.error.code, 'ESSAY_TOPIC_HAS_HISTORY')
  assert.deepEqual(await prisma.redacao.findUnique({ where: { id: redacao.id } }), redacao)
  assert.equal(await prisma.criterioAvaliacao.count({ where: { temaId: tema.id } }), 3)
})

test('reabrir turma e excluir conta não podem vencer na mesma corrida', async () => {
  const professor = await conta('PROFESSOR')
  const turma = await turmaDo(professor, false)
  const [reabertura, exclusao] = await Promise.all([
    request(app).post(`/api/turmas/${turma.id}/reabrir`).set(auth(professor)),
    removerConta(professor),
  ])
  const atual = await prisma.usuario.findUnique({ where: { id: professor.id } })
  const estadoTurma = await prisma.turma.findUnique({ where: { id: turma.id } })
  if (reabertura.status === 200) {
    assert.equal(exclusao.status, 409)
    assert.equal(exclusao.body.error.code, 'ACCOUNT_HAS_ACTIVE_CLASSES')
    assert.equal(atual.ativo, true)
    assert.equal(estadoTurma.ativa, true)
  } else {
    assert.equal(reabertura.status, 401)
    assert.equal(exclusao.status, 204)
    assert.equal(atual.ativo, false)
    assert.equal(estadoTurma.ativa, false)
  }
})

test('criação concorrente de turma impede a exclusão da conta do professor', { timeout: 20000 }, async t => {
  const professor = await conta('PROFESSOR')
  const [turma, resposta] = await concorrerComVinculo(t, async tx => {
    // A criação em produção usa a mesma trava antes de persistir a turma.
    await tx.$queryRaw`SELECT ativo FROM usuarios WHERE id = ${professor.id} FOR UPDATE`
    const turma = await tx.turma.create({
      data: { professorId: professor.id, nome: 'Turma concorrente', codigoAcesso: randomUUID() },
    })
    turmas.push(turma.id)
    return turma
  }, () => removerConta(professor).expect(409))
  assert.equal(resposta.body.error.code, 'ACCOUNT_HAS_ACTIVE_CLASSES')
  assert.equal((await prisma.usuario.findUniqueOrThrow({ where: { id: professor.id } })).ativo, true)
  assert.deepEqual(await prisma.turma.findUnique({ where: { id: turma.id } }), turma)
})

test('criação já autorizada não persiste turma após a exclusão da conta', async () => {
  const professor = await conta('PROFESSOR')
  await removerConta(professor).expect(204)
  // Chama o repositório para representar uma requisição que já passou pelo middleware.
  await assert.rejects(criarTurma({
    professorId: professor.id, nome: 'Turma concorrente', codigoAcesso: randomUUID(),
  }), { code: 'AUTHENTICATION_REQUIRED' })
  assert.equal(await prisma.turma.count({ where: { professorId: professor.id } }), 0)
})
