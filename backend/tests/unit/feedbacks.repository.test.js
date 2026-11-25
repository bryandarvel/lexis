import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prisma } from '../../src/config/prisma.js'
import { consultarFeedbackPublicadoAluno } from '../../src/modules/feedbacks/feedbacks.repository.js'

for (const status of ['RASCUNHO', 'ENVIADA', 'AVALIADA']) {
  test(`consulta feedback próprio ${status} sem confundir com redação inexistente`, async (t) => {
    const original = prisma.redacao.findFirst
    t.after(() => { prisma.redacao.findFirst = original })
    prisma.redacao.findFirst = async (consulta) => {
      assert.deepEqual(consulta.where, { id: 'redacao', alunoId: 'aluno' })
      assert.deepEqual(consulta.select.feedback.select.versoes.where, { status: 'PUBLICADA' })
      return { id: 'redacao', status, feedback: null }
    }
    assert.deepEqual(await consultarFeedbackPublicadoAluno({ redacaoId: 'redacao', alunoId: 'aluno' }),
      { status: 'FEEDBACK_INDISPONIVEL', feedbackVersao: null })
  })
}
test('não entrega publicação inconsistente com redação ainda não avaliada', async (t) => {
  const original = prisma.redacao.findFirst
  t.after(() => { prisma.redacao.findFirst = original })
  prisma.redacao.findFirst = async () => ({
    id: 'redacao', status: 'ENVIADA', feedback: { versoes: [{ id: 'versao', status: 'PUBLICADA' }] },
  })
  assert.equal((await consultarFeedbackPublicadoAluno({ redacaoId: 'redacao', alunoId: 'aluno' })).feedbackVersao, null)
})
