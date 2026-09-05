import assert from 'node:assert/strict'

import { prisma } from '../src/config/prisma.js'

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
    prisma.turma.count({
      where: { codigoAcesso: 'LEX-DEMO' },
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
  assert.equal(turmas, 1)
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
        turmas,
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
