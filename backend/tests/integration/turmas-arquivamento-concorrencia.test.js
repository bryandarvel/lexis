import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, beforeEach, test } from 'node:test'
import { prisma } from '../../src/config/prisma.js'
import { env } from '../../src/config/env.js'
import {
  arquivarTurma,
  criarMatriculaAtivaComExclusividade,
} from '../../src/modules/turmas/turmas.repository.js'
import {
  criarTurmaParaProfessor,
  entrarEmTurmaComoAluno,
} from '../../src/modules/turmas/turmas.service.js'

let confirmado = false
let professor
let aluno
let turma
const usuarios = []
const turmas = []

before(async () => {
  const url = new URL(env.TEST_DATABASE_URL)
  assert.equal(url.hostname, '127.0.0.1')
  assert.equal(url.pathname, '/lexis_test')
  const [db] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  assert.equal(db.banco, 'lexis_test')
  confirmado = true
  for (const papel of ['PROFESSOR', 'ALUNO']) {
    const usuario = await prisma.usuario.create({ data: {
      nome: 'Fixture concorrência de matrícula',
      email: `matricula.concorrente.${randomUUID()}@lexis.example.com`,
      senhaHash: 'fixture-sem-login',
      papel,
    } })
    usuarios.push(usuario.id)
    if (papel === 'PROFESSOR') professor = usuario
    else aluno = usuario
  }
})

beforeEach(async () => {
  await prisma.matricula.deleteMany({ where: { alunoId: aluno.id } })
  turma = await criarTurmaParaProfessor({ nome: 'Turma fictícia concorrente', professorId: professor.id })
  turmas.push(turma.id)
})

after(async () => {
  if (confirmado) {
    await prisma.matricula.deleteMany({ where: { turmaId: { in: turmas } } })
    await prisma.turma.deleteMany({ where: { id: { in: turmas } } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } })
  }
  await prisma.$disconnect()
})

// Só agenda operações: todas as consultas, locks e commits são do MySQL real.
function interceptarTransacoes(t, interceptar) {
  const metodoOriginal = prisma.$transaction
  const original = prisma.$transaction.bind(prisma)
  t.after(() => { prisma.$transaction = metodoOriginal })
  let numero = 0
  prisma.$transaction = (callback) => {
    const atual = ++numero
    return original((tx) => callback(new Proxy(tx, {
      get(target, propriedade) {
        const valor = target[propriedade]
        if (propriedade === '$queryRaw') {
          return (...args) => interceptar(atual, '$queryRaw', args, () => valor.apply(target, args))
        }
        if (['turma', 'matricula'].includes(propriedade)) {
          return new Proxy(valor, { get(modelo, metodo) {
            const operacao = modelo[metodo]
            if (typeof operacao !== 'function') return operacao
            return (...args) => interceptar(atual, `${propriedade}.${metodo}`, args, () => operacao.apply(modelo, args))
          } })
        }
        return valor
      },
    })), { timeout: 10000 })
  }
}

async function conferirArquivamento() {
  assert.equal((await prisma.turma.findUnique({ where: { id: turma.id } })).ativa, false)
  assert.equal(await prisma.matricula.count({ where: { turmaId: turma.id, status: 'ATIVA' } }), 0)
}

test('arquivamento iniciado primeiro impede matrícula baseada em leitura antiga', { timeout: 15000 }, async (t) => {
  const arquivoPausado = Promise.withResolvers()
  const liberarArquivo = Promise.withResolvers()
  const entradaPonto = Promise.withResolvers()
  const liberarEntrada = Promise.withResolvers()
  interceptarTransacoes(t, async (numero, operacao, args, executar) => {
    if (numero === 1 && operacao === 'turma.updateMany') {
      const resultado = await executar()
      arquivoPausado.resolve()
      await liberarArquivo.promise
      return resultado
    }
    // Com o lock corrigido, a leitura aguarda o arquivamento; no código antigo,
    // o SELECT não bloqueante devolve ativa=true e fica pausado antes do INSERT.
    if (numero === 2 && operacao === '$queryRaw' && args[0].join(' ').includes('FROM turmas')) {
      entradaPonto.resolve()
    }
    const resultado = await executar()
    if (numero === 2 && operacao === 'turma.findFirst') {
      entradaPonto.resolve()
      await liberarEntrada.promise
    }
    return resultado
  })
  const arquivo = arquivarTurma({ turmaId: turma.id, professorId: professor.id })
  let entrada
  try {
    await arquivoPausado.promise
    entrada = criarMatriculaAtivaComExclusividade({ alunoId: aluno.id, turmaId: turma.id })
    await entradaPonto.promise
    liberarArquivo.resolve()
    await arquivo
    liberarEntrada.resolve()
    assert.equal((await entrada).status, 'TURMA_INDISPONIVEL')
    await conferirArquivamento()
  } finally {
    liberarArquivo.resolve()
    liberarEntrada.resolve()
    await Promise.allSettled([arquivo, entrada])
  }
})

test('entrada iniciada primeiro é encerrada pelo arquivamento concorrente', { timeout: 15000 }, async (t) => {
  const entradaPausada = Promise.withResolvers()
  const liberarEntrada = Promise.withResolvers()
  const arquivoPonto = Promise.withResolvers()
  interceptarTransacoes(t, async (numero, operacao, _args, executar) => {
    if (numero === 1 && operacao === 'matricula.create') {
      entradaPausada.resolve()
      await liberarEntrada.promise
    }
    if (numero === 2 && operacao === 'turma.updateMany') arquivoPonto.resolve()
    return executar()
  })
  const entrada = criarMatriculaAtivaComExclusividade({ alunoId: aluno.id, turmaId: turma.id })
  let arquivo
  try {
    await entradaPausada.promise
    arquivo = arquivarTurma({ turmaId: turma.id, professorId: professor.id })
    await arquivoPonto.promise
    liberarEntrada.resolve()
    await Promise.all([entrada, arquivo])
    await conferirArquivamento()
    const historico = await prisma.matricula.findFirst({ where: { turmaId: turma.id, alunoId: aluno.id } })
    assert.equal(historico.status, 'ENCERRADA')
    assert.ok(historico.encerradaEm)
  } finally {
    liberarEntrada.resolve()
    await Promise.allSettled([entrada, arquivo])
  }
})

test('turma já arquivada mantém erro de domínio e não cria matrícula', async () => {
  await arquivarTurma({ turmaId: turma.id, professorId: professor.id })
  await assert.rejects(entrarEmTurmaComoAluno({ alunoId: aluno.id, codigoAcesso: turma.codigoAcesso }),
    (erro) => erro.statusCode === 404 && erro.code === 'CLASS_ACCESS_CODE_INVALID')
  await conferirArquivamento()
})
