export const TURMA_DEMO_ID = '20000000-0000-4000-8000-000000000001'
export const PROFESSOR_DEMO_ID = '10000000-0000-4000-8000-000000000001'
export const PROFESSOR_DEMO_EMAIL = 'professor.demo@lexis.example.com'
export const CODIGO_TURMA_DEMO = 'LEXDEM26'
const CODIGO_LEGADO = 'LEX-DEMO'

// Atualização específica, sem recriar contas, matrículas, propostas ou redações.
export async function corrigirCodigoTurmaDemo(client, { aplicar = false } = {}) {
  const turma = await client.turma.findUnique({
    where: { id: TURMA_DEMO_ID },
    include: { professor: { select: { id: true, email: true, papel: true } } },
  })

  if (!turma) return { status: 'AUSENTE' }
  if (turma.professorId !== PROFESSOR_DEMO_ID ||
      turma.professor.id !== PROFESSOR_DEMO_ID ||
      turma.professor.email !== PROFESSOR_DEMO_EMAIL ||
      turma.professor.papel !== 'PROFESSOR') {
    throw new Error('A identidade da turma fictícia não foi confirmada. Nenhum dado foi alterado.')
  }
  if (turma.codigoAcesso !== CODIGO_LEGADO) {
    if (/^[A-HJ-NP-Z2-9]{8}$/.test(turma.codigoAcesso)) {
      return { status: 'JA_VALIDO' }
    }
    throw new Error('O código encontrado não corresponde ao legado esperado. Nenhum dado foi alterado.')
  }
  const conflito = await client.turma.findUnique({ where: { codigoAcesso: CODIGO_TURMA_DEMO } })
  if (conflito) {
    throw new Error('O novo código já pertence a outra turma. Nenhum dado foi alterado.')
  }
  if (!aplicar) return { status: 'PENDENTE', codigoNovo: CODIGO_TURMA_DEMO }

  const resultado = await client.turma.updateMany({
    where: {
      id: TURMA_DEMO_ID,
      professorId: PROFESSOR_DEMO_ID,
      codigoAcesso: CODIGO_LEGADO,
      professor: { email: PROFESSOR_DEMO_EMAIL, papel: 'PROFESSOR' },
    },
    data: { codigoAcesso: CODIGO_TURMA_DEMO },
  })
  if (resultado.count !== 1) {
    throw new Error('A turma mudou durante a conferência. A atualização não foi aplicada.')
  }
  return { status: 'CORRIGIDO', codigoNovo: CODIGO_TURMA_DEMO }
}
