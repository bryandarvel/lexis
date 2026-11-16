import { motion } from 'motion/react'

export default function RouteLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-pagina text-texto"
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          className="h-12 w-12 rounded-full border-4 border-borda border-t-acao"
          animate={{ rotate: 360 }}
          transition={{
            duration: 0.9,
            ease: 'linear',
            repeat: Infinity,
          }}
        />

        <p className="text-sm font-medium text-texto-suave">
          Verificando sua sessão...
        </p>
      </div>
    </main>
  )
}