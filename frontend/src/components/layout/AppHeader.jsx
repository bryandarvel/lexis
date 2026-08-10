import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useNavigate,
} from 'react-router'

import { useAuth } from '../../hooks/useAuth.js'

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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-lexis-200/10 bg-lexis-950/90 backdrop-blur-xl">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-6"
      >
        <Link
          to={rotaInicial}
          className="text-2xl font-black tracking-tight text-lexis-50 transition-colors hover:text-lexis-300"
        >
          LÉXIS
        </Link>

        <Link
          to={rotaInicial}
          className="hidden text-sm font-medium text-lexis-100 transition-colors hover:text-white md:inline-flex"
        >
          Início
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="max-w-48 truncate text-sm font-semibold text-lexis-50">
              {usuario?.nome ?? 'Usuário'}
            </p>

            <p className="text-xs text-lexis-300">
              {papelExibido}
            </p>
          </div>

          <motion.button
            type="button"
            disabled={saindo}
            onClick={handleSair}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="rounded-full border border-lexis-300/30 bg-lexis-900/80 px-4 py-2 text-sm font-semibold text-lexis-100 transition-colors hover:border-lexis-300/60 hover:bg-lexis-800 disabled:cursor-wait disabled:opacity-60"
          >
            {saindo ? 'Saindo...' : 'Sair'}
          </motion.button>
        </div>
      </nav>
    </header>
  )
}