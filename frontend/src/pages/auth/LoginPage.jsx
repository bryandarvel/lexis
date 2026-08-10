import { motion } from 'motion/react'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-lexis-950 via-lexis-900 to-lexis-700 px-6 text-lexis-50">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-3xl rounded-3xl border border-lexis-300/20 bg-lexis-950/60 p-8 shadow-2xl backdrop-blur md:p-12"
      >
        <span className="inline-flex rounded-full bg-lexis-400/15 px-4 py-2 text-sm font-semibold text-lexis-200">
          Acesso à plataforma
        </span>

        <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
          LÉXIS
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-8 text-lexis-100">
          Plataforma de análise de repertórios socioculturais em redações.
        </p>

        <p className="mt-8 text-sm text-lexis-300">
          O formulário de autenticação será implementado em uma etapa posterior.
        </p>
      </motion.section>
    </main>
  )
}