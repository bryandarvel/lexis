import { env } from '../src/config/env.js'
import { prisma } from '../src/config/prisma.js'
import { corrigirCodigoTurmaDemo } from '../prisma/demo-turma.js'

async function main() {
  const args = process.argv.slice(2)
  if (args.some((arg) => arg !== '--apply')) throw new Error('Use somente --apply para aplicar a correção.')
  const url = new URL(env.NODE_ENV === 'test' ? env.TEST_DATABASE_URL : env.DATABASE_URL)
  if (env.NODE_ENV === 'production' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['lexis', 'lexis_test'].includes(decodeURIComponent(url.pathname.slice(1)))) {
    throw new Error('Este comando aceita apenas o banco local lexis ou lexis_test fora de produção.')
  }
  const resultado = await corrigirCodigoTurmaDemo(prisma, { aplicar: args.includes('--apply') })
  console.log(JSON.stringify(resultado))
  if (resultado.status === 'PENDENTE') console.log('Somente conferência. Para alterar apenas o código fictício, execute com --apply após aprovação.')
}

main().catch((erro) => {
  // Não imprimir erros brutos do ORM que possam conter dados de conexão.
  console.error(erro.name === 'Error' ? erro.message : 'Não foi possível corrigir o código fictício.')
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
