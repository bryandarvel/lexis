import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useNavigate,
} from 'react-router'

import { useAuth } from '../../hooks/useAuth.js'
import ThemeToggle from './ThemeToggle.jsx'

function obterRotaInicial(papel) {
  return papel === 'PROFESSOR'
    ? '/professor'
    : '/aluno'
}

export default function AppHeader() {
  const {
    usuario,
    sair,
  } = useAuth()

  const navigate = useNavigate()
  const [saindo, setSaindo] = useState(false)

  const rotaInicial = obterRotaInicial(
    usuario?.papel,
  )

  const papelExibido =
    usuario?.papel === 'PROFESSOR'
      ? 'Professor'
      : 'Aluno'

  async function handleSair() {
    if (saindo) {
      return
    }

    setSaindo(true)

    try {
      await sair()
    } catch {
      // A sessão local já é removida pelo AuthProvider.
    }

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <header className="surface-shell fixed inset-x-0 top-0 z-50 border-b backdrop-blur-[8px]">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-6"
      >
        <Link
          to={rotaInicial}
          className="brand-wordmark text-2xl font-bold tracking-tight text-white transition-colors hover:text-lexis-300"
        >
          LÉXIS
        </Link>

        <Link
          to={rotaInicial}
          className="hidden text-sm font-medium text-white/85 transition-colors hover:text-white md:inline-flex"
        >
          Início
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="max-w-48 truncate text-sm font-semibold text-white">
              {usuario?.nome ?? 'Usuário'}
            </p>

            <p className="text-xs text-white/70">
              {papelExibido}
            </p>
          </div>

          <ThemeToggle compacto />

          <motion.button
            type="button"
            disabled={saindo}
            onClick={handleSair}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="rounded-full border border-white/25 bg-[var(--surface-shell-2)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-[var(--surface-shell-3)] disabled:cursor-wait disabled:opacity-60"
          >
            {saindo ? 'Saindo...' : 'Sair'}
          </motion.button>
        </div>
      </nav>
    </header>
  )
}
