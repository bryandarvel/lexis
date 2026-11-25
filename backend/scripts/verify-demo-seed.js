import assert from 'node:assert/strict'

import { prisma } from '../src/config/prisma.js'
import { TURMA_DEMO_ID, PROFESSOR_DEMO_ID, PROFESSOR_DEMO_EMAIL } from '../prisma/demo-turma.js'

const TEMA_DEMO_ID =
  '30000000-0000-4000-8000-000000000001'

async function main() {
  const [
    usuarios,
    turmas,
    temas,
    redacoes,
    analises,
    feedbacks,
    notificacoes,
    criterios,
  ] = await Promise.all([
    prisma.usuario.count({
      where: {
        email: {
          endsWith: 'demo@lexis.example.com',
        },
      },
    }),
    prisma.turma.findUnique({
      where: { id: TURMA_DEMO_ID },
      select: { codigoAcesso: true, professorId: true, professor: { select: { email: true, papel: true } } },
    }),
    prisma.temaRedacao.count({
      where: { id: TEMA_DEMO_ID },
    }),
    prisma.redacao.groupBy({
      by: ['status'],
      where: { temaId: TEMA_DEMO_ID },
      _count: { _all: true },
    }),
    prisma.analiseIA.count({
      where: {
        id: {
          in: [
            '50000000-0000-4000-8000-000000000001',
            '50000000-0000-4000-8000-000000000002',
          ],
        },
      },
    }),
    prisma.feedback.count({
      where: {
        id: {
          in: [
            '60000000-0000-4000-8000-000000000001',
            '60000000-0000-4000-8000-000000000002',
          ],
        },
      },
    }),
    prisma.notificacao.count({
      where: {
        id: '70000000-0000-4000-8000-000000000001',
      },
    }),
    prisma.criterioAvaliacao.findMany({
      where: { temaId: TEMA_DEMO_ID },
      select: { nome: true },
      orderBy: { ordem: 'asc' },
    }),
  ])

  const totalRedacoes = redacoes.reduce(
    (total, item) => total + item._count._all,
    0,
  )

  assert.equal(usuarios, 6)
  assert.ok(turmas, 'Turma fictícia não encontrada')
  assert.equal(turmas.professorId, PROFESSOR_DEMO_ID)
  assert.equal(turmas.professor.email, PROFESSOR_DEMO_EMAIL)
  assert.equal(turmas.professor.papel, 'PROFESSOR')
  assert.match(turmas.codigoAcesso, /^[A-HJ-NP-Z2-9]{8}$/, 'Código fictício inválido; use db:demo:code para conferir a correção específica, sem repetir o seed.')
  assert.equal(temas, 1)
  assert.equal(totalRedacoes, 5)
  assert.equal(analises, 2)
  assert.equal(feedbacks, 2)
  assert.equal(notificacoes, 1)
  assert.deepEqual(
    criterios.map((criterio) => criterio.nome),
    ['Legitimação', 'Pertinência', 'Uso produtivo'],
  )

  console.log(
    JSON.stringify(
      {
        usuarios,
        turmas: 1,
        temas,
        criterios: criterios.length,
        redacoes: Object.fromEntries(
          redacoes.map((item) => [
            item.status,
            item._count._all,
          ]),
        ),
        analises,
        feedbacks,
        notificacoes,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((erro) => {
    console.error('A verificação do seed falhou.')
    console.error(erro)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
