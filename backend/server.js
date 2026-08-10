import { app } from './src/app.js'
import { env } from './src/config/env.js'
import { prisma } from './src/config/prisma.js'

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`LÉXIS API disponível em http://${env.HOST}:${env.PORT}`)
})

let encerrando = false

function encerrarServidor(signal) {
  if (encerrando) {
    return
  }

  encerrando = true
  console.log(`\nSinal ${signal} recebido. Encerrando a API...`)

  const encerramentoForcado = setTimeout(() => {
    console.error('Tempo limite de encerramento excedido.')
    process.exit(1)
  }, 10000)

  encerramentoForcado.unref()

  server.close(async (error) => {
    clearTimeout(encerramentoForcado)
    await prisma.$disconnect()

    if (error) {
      console.error('Erro ao encerrar o servidor:', error)
      process.exit(1)
    }

    console.log('API e conexão com o banco encerradas.')
    process.exit(0)
  })
}

process.on('SIGINT', () => encerrarServidor('SIGINT'))
process.on('SIGTERM', () => encerrarServidor('SIGTERM'))