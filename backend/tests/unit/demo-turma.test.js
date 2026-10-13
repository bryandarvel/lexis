import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CODIGO_TURMA_DEMO, PROFESSOR_DEMO_EMAIL, PROFESSOR_DEMO_ID, TURMA_DEMO_ID, corrigirCodigoTurmaDemo } from '../../prisma/demo-turma.js'
import { entrarTurmaSchema } from '../../src/modules/turmas/turmas.schemas.js'

function criarClient({ codigo = 'LEX-DEMO', professorId = PROFESSOR_DEMO_ID, email = PROFESSOR_DEMO_EMAIL, conflito = null, count = 1, ausente = false } = {}) {
  const atualizacoes = []
  const turma = ausente ? null : { id: TURMA_DEMO_ID, codigoAcesso: codigo, professorId, professor: { id: professorId, email, papel: 'PROFESSOR' } }
  return {
    atualizacoes,
    turma: {
      findUnique: async ({ where }) => where.id ? turma : conflito,
      updateMany: async (dados) => { atualizacoes.push(dados); return { count } },
    },
  }
}

test('o novo código fictício é aceito pelo contrato real de matrícula', () => {
  assert.equal(entrarTurmaSchema.safeParse({ codigoAcesso: CODIGO_TURMA_DEMO }).success, true)
  assert.equal(entrarTurmaSchema.safeParse({ codigoAcesso: 'LEX-DEMO' }).success, false)
})

test('a conferência da correção nunca escreve e a aplicação altera somente o código legado', async () => {
  const client = criarClient()
  assert.equal((await corrigirCodigoTurmaDemo(client)).status, 'PENDENTE')
  assert.equal(client.atualizacoes.length, 0)
  assert.equal((await corrigirCodigoTurmaDemo(client, { aplicar: true })).status, 'CORRIGIDO')
  assert.deepEqual(client.atualizacoes, [{
    where: { id: TURMA_DEMO_ID, professorId: PROFESSOR_DEMO_ID, codigoAcesso: 'LEX-DEMO', professor: { email: PROFESSOR_DEMO_EMAIL, papel: 'PROFESSOR' } },
    data: { codigoAcesso: CODIGO_TURMA_DEMO },
  }])
})

test('preserva código já regenerado e não cria uma turma ausente', async () => {
  for (const [opcoes, status] of [[{ codigo: 'ABCD2345' }, 'JA_VALIDO'], [{ ausente: true }, 'AUSENTE']]) {
    const client = criarClient(opcoes)
    assert.equal((await corrigirCodigoTurmaDemo(client, { aplicar: true })).status, status)
    assert.equal(client.atualizacoes.length, 0)
  }
})

test('recusa identidade diferente, código inesperado e colisão sem alterar dados', async () => {
  for (const opcoes of [
    { professorId: 'outro-professor' },
    { email: 'professor.real@example.com' },
    { codigo: 'INVALIDO' },
    { conflito: { id: 'outra-turma' } },
  ]) {
    const client = criarClient(opcoes)
    await assert.rejects(corrigirCodigoTurmaDemo(client, { aplicar: true }))
    assert.equal(client.atualizacoes.length, 0)
  }
})

test('não considera concluída uma atualização perdida por mudança concorrente', async () => {
  await assert.rejects(corrigirCodigoTurmaDemo(criarClient({ count: 0 }), { aplicar: true }), /mudou durante/)
})
