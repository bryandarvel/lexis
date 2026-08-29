import { motion } from 'motion/react'
import { Link } from 'react-router'

import ThemeToggle from '../layout/ThemeToggle.jsx'

const recursos = [
  'Redações organizadas por turma',
  'Análise assistida por inteligência artificial',
  'Feedback pedagógico em um só lugar',
]

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-lexis-950 px-4 py-6 text-lexis-50 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="surface-card relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[18px] lg:grid-cols-[1.05fr_0.95fr]"
      >
        <section className="surface-shell relative flex flex-col justify-between overflow-hidden border-b p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
          <div className="relative">
            <Link
              to="/login"
              className="brand-wordmark inline-flex rounded-lg text-3xl font-bold tracking-[-0.04em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-shell-1)]"
              aria-label="LÉXIS — página de login"
            >
              LÉXIS
            </Link>

            <div className="mt-24 hidden max-w-lg lg:block">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/70">
                Sua escrita em foco
              </p>
              <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                Da primeira versão ao feedback que faz evoluir.
              </h2>
              <p className="mt-5 max-w-md leading-7 text-white/80">
                Um ambiente acadêmico para alunos e professores acompanharem cada etapa da redação.
              </p>
            </div>
          </div>

          <ul className="relative mt-10 hidden gap-3 text-sm text-white/85 lg:grid">
            {recursos.map((recurso) => (
              <li
                key={recurso}
                className="flex items-center gap-3"
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-lexis-300"
                />
                {recurso}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center p-7 sm:p-10 lg:p-14">
          <div className="w-full">
            <span className="inline-flex rounded-full border border-lexis-300/20 bg-lexis-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-lexis-200">
              {eyebrow}
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-md leading-7 text-lexis-200/80">
              {description}
            </p>

            <div className="mt-8">{children}</div>

            <div className="mt-7 border-t border-lexis-200/10 pt-6 text-sm text-lexis-200/80">
              {footer}
            </div>
          </div>
        </section>
      </motion.div>
    </main>
  )
}
