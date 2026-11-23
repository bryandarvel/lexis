import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { CAIXA_FICTICIA, WEB_URL, configurarAmbiente } from './runtime.js'

configurarAmbiente()
// O SDK de e-mail é exercitado contra o stub abaixo, nunca pela rede.
Object.assign(process.env, {
  EMAIL_ENABLED: 'true',
  EMAIL_DEMO_RECIPIENT: CAIXA_FICTICIA,
  RESEND_API_KEY: 'fixture-e2e-sem-provedor',
})
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

// Simula só as fronteiras externas. Upload, autorização, domínio e
// persistência continuam na aplicação real.
const linksFicticios = new Map()
globalThis.fetch = async (url, opcoes) => {
  if (String(url) === 'https://api.resend.com/emails' && opcoes?.method === 'POST') {
    const email = JSON.parse(opcoes.body)
    if (email.to?.length !== 1 || email.to[0] !== CAIXA_FICTICIA) {
      throw new Error('Somente a caixa de teste é permitida.')
    }
    const link = email.text?.match(/https?:\/\/\S+/u)?.[0]
    if (link) {
      const destino = new URL(link)
      if (destino.origin !== WEB_URL || !['/redefinir-senha', '/confirmar-email'].includes(destino.pathname)) {
        throw new Error('Destino de teste inválido.')
      }
      linksFicticios.set(destino.pathname.slice(1), destino.href)
    }
    return Response.json({ id: randomUUID() })
  }
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
const { processarFilaRecuperacao } = await import('../backend/src/modules/auth/password-recovery.service.js')
const trechosSimulados = ['A Constituição Federal', 'A Constituição Federal assegura o direito à educação.']
const teste = express()
teste.disable('x-powered-by')
teste.use(helmet({ contentSecurityPolicy: false }))
teste.use(cors({ origin: process.env.FRONTEND_URL, credentials: true, exposedHeaders: ['X-Request-Id'] }))
teste.use(express.json({ limit: '1mb' }))
// Caixa em memória do servidor exclusivo de E2E, ligado a loopback e
// permitido apenas após conferir que o banco é lexis_test.
teste.post('/__e2e/email/:tipo', async (req, res) => {
  const { tipo } = req.params
  if (tipo === 'redefinir-senha') await processarFilaRecuperacao()
  const link = linksFicticios.get(tipo)
  linksFicticios.delete(tipo)
  res.set('Cache-Control', 'no-store').json({ link })
})
teste.use('/api', criarAnalisesIaRouter({
  solicitarAnalise: (args) => solicitarAnaliseIaParaProfessor(args, {
    gerar: async () => ({ texto: JSON.stringify({
      resumoGeral: 'Análise fictícia consultiva, sem atribuição de nota.',
      pontosFortes: [], pontosDeAtencao: [],
      analisePorCriterio: MODELO_COMPETENCIA_DOIS.criterios.map((c, i) => ({
        ordem: i + 1, criterio: c.nome, diagnostico: 'Sugestão fictícia para revisão humana.',
        evidencias: i === 0 ? trechosSimulados.map((trecho) => ({ trecho, inicio: 0, fim: trecho.length })) : [],
        orientacaoAoProfessor: 'Revise antes de publicar.',
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
