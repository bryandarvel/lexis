import {
  useEffect,
  useState,
} from 'react'
import { motion } from 'motion/react'
import {
  Link,
  NavLink,
  useNavigate,
} from 'react-router'

import { useAuth } from '../../hooks/useAuth.js'
import {
  listarNotificacoes,
} from '../../services/notificacoes.js'
import {
  observarContagemNotificacoes,
} from '../../services/notification-events.js'
import ThemeToggle from './ThemeToggle.jsx'

function obterRotaInicial(papel) {
  return papel === 'PROFESSOR'
    ? '/professor/turmas'
    : '/aluno'
}

export default function AppHeader() {
  const {
    usuario,
    sair,
  } = useAuth()

  const navigate = useNavigate()
  const [saindo, setSaindo] = useState(false)
  const [totalNaoLidas, setTotalNaoLidas] = useState(0)

  useEffect(() => {
    if (usuario?.papel !== 'ALUNO') return undefined

    let ativo = true
    const controlador = new AbortController()
    const pararObservacao = observarContagemNotificacoes(
      (total) => {
        if (ativo && Number.isInteger(total)) {
          setTotalNaoLidas(Math.max(0, total))
        }
      },
    )

    listarNotificacoes({ signal: controlador.signal })
      .then((resultado) => {
        if (ativo) setTotalNaoLidas(resultado.totalNaoLidas)
      })
      .catch(() => {
        // A página de notificações oferece o tratamento de erro completo.
      })

    return () => {
      ativo = false
      controlador.abort()
      pararObservacao()
    }
  }, [usuario?.papel])

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
    <header className="surface-shell app-header fixed inset-x-0 top-0 z-50 border-b">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6"
      >
        <Link
          to={rotaInicial}
          className="brand-wordmark text-2xl font-bold tracking-tight text-white transition-colors hover:text-lexis-300"
        >
          LÉXIS
        </Link>

        {usuario?.papel === 'PROFESSOR' ? (
          <NavLink
            to="/professor/turmas"
            end
            className="hidden text-sm font-medium text-white/85 transition-colors hover:text-white md:inline-flex"
          >
            Turmas
          </NavLink>
        ) : (
          <NavLink
            to={rotaInicial}
            end
            className="hidden text-sm font-medium text-white/85 transition-colors hover:text-white md:inline-flex"
          >
            Início
          </NavLink>
        )}

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

          {usuario?.papel === 'ALUNO' && (
            <Link
              to="/aluno/notificacoes"
              aria-label={
                totalNaoLidas === 1
                  ? 'Notificações: 1 aviso não lido'
                  : `Notificações: ${totalNaoLidas} avisos não lidos`
              }
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-[var(--surface-shell-2)] text-white transition hover:border-white/50 hover:bg-[var(--surface-shell-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lexis-300"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>

              {totalNaoLidas > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white"
                >
                  {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
                </span>
              )}
            </Link>
          )}

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
