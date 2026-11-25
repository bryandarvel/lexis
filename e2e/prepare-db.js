import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { configurarAmbiente } from './runtime.js'

configurarAmbiente()
const backend = fileURLToPath(new URL('../backend/', import.meta.url))
const cli = fileURLToPath(new URL('../backend/node_modules/prisma/build/index.js', import.meta.url))
function prismaCli(args) {
  const resultado = spawnSync(process.execPath, [cli, ...args], {
    cwd: backend, env: process.env, encoding: 'utf8',
  })
  if (resultado.status !== 0) throw new Error('Preparação Prisma falhou. Confira a configuração local de teste; nenhum segredo será exibido.')
}
prismaCli(['generate', '--no-hints'])
const { prisma } = await import('../backend/src/config/prisma.js')
try {
  const [banco] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
  if (banco.banco !== 'lexis_test') throw new Error('Banco real diferente de lexis_test; migration recusada.')
} finally {
  await prisma.$disconnect()
}
prismaCli(['migrate', 'deploy'])
console.log('Client gerado e migrations verificadas somente em lexis_test local.')
