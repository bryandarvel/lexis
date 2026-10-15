import { createRequire } from 'node:module'
import { configurarAmbiente } from './runtime.js'

configurarAmbiente()
const requireBackend = createRequire(new URL('../backend/package.json', import.meta.url))
const express = requireBackend('express')
const cors = requireBackend('cors')
const helmet = requireBackend('helmet')
const { prisma } = await import('../backend/src/config/prisma.js')
const [banco] = await prisma.$queryRaw`SELECT DATABASE() AS banco`
if (banco.banco !== 'lexis_test') {
  await prisma.$disconnect()
  throw new Error('Banco real não corresponde ao destino exclusivo de teste.')
}

// Somente a fronteira externa do OCR é simulada. Upload, autorização,
// domínio e persistência continuam na aplicação real.
globalThis.fetch = async (url) => {
  if (String(url) !== process.env.OCR_SPACE_API_URL) {
    throw new Error('Chamadas externas não autorizadas no servidor E2E.')
  }
  return new Response(JSON.stringify({
    IsErroredOnProcessing: false,
    ParsedResults: [{ ParsedText: 'A Constituição Federal assegura o direito à educação. Transcrição fictícia para revisão.' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}

const { app } = await import('../backend/src/app.js')
const { criarAnalisesIaRouter } = await import('../backend/src/modules/avaliacao-ia/analise-ia.routes.js')
const { solicitarAnaliseIaParaProfessor } = await import('../backend/src/modules/avaliacao-ia/analise-ia.service.js')
const { MODELO_COMPETENCIA_DOIS } = await import('../backend/src/modules/temas/temas.competencia-dois.js')
const { errorHandler } = await import('../backend/src/middlewares/error-handler.js')
const teste = express()
teste.disable('x-powered-by')
teste.use(helmet({ contentSecurityPolicy: false }))
teste.use(cors({ origin: process.env.FRONTEND_URL, credentials: true, exposedHeaders: ['X-Request-Id'] }))
teste.use(express.json({ limit: '1mb' }))
teste.use('/api', criarAnalisesIaRouter({
  solicitarAnalise: (args) => solicitarAnaliseIaParaProfessor(args, {
    gerar: async () => ({ texto: JSON.stringify({
      resumoGeral: 'Análise fictícia consultiva, sem atribuição de nota.',
      pontosFortes: [], pontosDeAtencao: [],
      analisePorCriterio: MODELO_COMPETENCIA_DOIS.criterios.map((c, i) => ({
        ordem: i + 1, criterio: c.nome, diagnostico: 'Sugestão fictícia para revisão humana.',
        evidencias: [], orientacaoAoProfessor: 'Revise antes de publicar.',
      })),
      observacoesFinais: 'Não substitui a decisão do professor.',
    }) }),
  }),
}))
teste.use(app)
teste.use(errorHandler)
const servidor = teste.listen(3100, '127.0.0.1')
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    servidor.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  })
}
