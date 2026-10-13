import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  Link,
  NavLink,
  useNavigate,
} from 'react-router'

import ThemeToggle from '../components/layout/ThemeToggle.jsx'
import { useAuth } from '../hooks/useAuth.js'
import {
  useNotificacoesNaoLidas,
} from '../hooks/useNotificacoesNaoLidas.js'
import { obterIniciais } from '../utils/aluno-painel.js'
import './aluno-layout.css'

const classeItemNavegacao =
  'aluno-foco-shell relative flex h-[42px] w-full items-center gap-2.5 rounded-lg pl-3.5 pr-3 text-sm leading-[22px] transition-colors'

function IconeInicio() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function IconeEscrever() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconeSino() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}

function IconeMenu() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-5"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function ItemNavegacao({
  to,
  end = false,
  icone,
  onNavegar,
  children,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavegar}
      className={({ isActive }) =>
        `${classeItemNavegacao} ${
          isActive
            ? 'bg-[var(--surface-shell-3)] text-[var(--aluno-shell-texto)]'
            : 'text-[var(--aluno-shell-texto-suave)] hover:bg-[var(--surface-shell-2)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-[9px] h-6 w-[3px] rounded-full bg-[var(--aluno-shell-texto-suave)]"
            />
          )}
          <span
            className={
              isActive
                ? 'text-[var(--aluno-shell-texto-suave)]'
                : 'text-[var(--aluno-shell-icone)]'
            }
          >
            {icone}
          </span>
          {children}
        </>
      )}
    </NavLink>
  )
}

function MenuUsuario({
  usuario,
  saindo,
  onSair,
}) {
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef(null)
  const painelRef = useRef(null)
  const idPainel = useId()

  useEffect(() => {
    if (!aberto) return undefined

    function fecharComEscape(evento) {
      if (evento.key === 'Escape') {
        setAberto(false)
        botaoRef.current?.focus()
      }
    }

    function fecharAoClicarFora(evento) {
      if (
        !painelRef.current?.contains(evento.target) &&
        !botaoRef.current?.contains(evento.target)
      ) {
        setAberto(false)
      }
    }

    document.addEventListener('keydown', fecharComEscape)
    document.addEventListener(
      'pointerdown',
      fecharAoClicarFora,
    )

    return () => {
      document.removeEventListener(
        'keydown',
        fecharComEscape,
      )
      document.removeEventListener(
        'pointerdown',
        fecharAoClicarFora,
      )
    }
  }, [aberto])

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={`Menu do usuário: ${usuario?.nome ?? 'Aluno'}`}
        onClick={() => setAberto((atual) => !atual)}
        className="aluno-foco-shell flex size-[30px] items-center justify-center rounded-full bg-[var(--aluno-avatar)] text-xs font-medium leading-[17px] text-[var(--aluno-shell-texto)] transition hover:brightness-110"
      >
        <span aria-hidden="true">
          {obterIniciais(usuario?.nome)}
        </span>
      </button>

      {aberto && (
        <div
          ref={painelRef}
          id={idPainel}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-xl border border-[var(--surface-border)] bg-lexis-900 p-4 text-lexis-50 shadow-[0_12px_32px_rgba(0,32,73,0.18)]"
        >
          <p className="truncate text-sm font-semibold">
            {usuario?.nome ?? 'Aluno'}
          </p>
          {usuario?.email && (
            <p className="mt-0.5 truncate text-xs text-lexis-200">
              {usuario.email}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--surface-border)] pt-4">
            <span className="text-xs font-medium text-lexis-200">
              Tema
            </span>
            <ThemeToggle />
          </div>

          <button
            type="button"
            disabled={saindo}
            onClick={onSair}
            className="mt-4 h-10 w-full rounded-lg border border-[var(--aluno-borda-campo)] text-[13px] font-semibold text-lexis-100 transition-colors hover:bg-[var(--aluno-neutro-fundo)] disabled:cursor-wait disabled:opacity-60"
          >
            {saindo ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AlunoLayout({
  rotaEnviarRedacao = null,
  children,
}) {
  const {
    usuario,
    sair,
  } = useAuth()
  const navigate = useNavigate()
  const totalNaoLidas = useNotificacoesNaoLidas({
    habilitado: usuario?.papel === 'ALUNO',
  })
  const [saindo, setSaindo] = useState(false)
  const [navegacaoAberta, setNavegacaoAberta] =
    useState(false)
  const botaoNavegacaoRef = useRef(null)
  const navegacaoRef = useRef(null)

  useEffect(() => {
    if (!navegacaoAberta) return undefined

    navegacaoRef.current
      ?.querySelector('a, [tabindex="0"]')
      ?.focus()

    function fecharComEscape(evento) {
      if (evento.key === 'Escape') {
        setNavegacaoAberta(false)
        botaoNavegacaoRef.current?.focus()
      }
    }

    document.addEventListener('keydown', fecharComEscape)

    return () =>
      document.removeEventListener(
        'keydown',
        fecharComEscape,
      )
  }, [navegacaoAberta])

  function fecharNavegacao() {
    setNavegacaoAberta(false)
  }

  async function handleSair() {
    if (saindo) return

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

  const rotuloNotificacoes =
    totalNaoLidas === 1
      ? 'Notificações: 1 aviso não lido'
      : `Notificações: ${totalNaoLidas} avisos não lidos`

  return (
    <div className="aluno-shell min-h-screen bg-[var(--page-background)] text-lexis-50">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-lexis-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-lexis-50"
      >
        Pular para o conteúdo
      </a>

      <header className="fixed inset-x-0 top-0 z-50 h-14 bg-[var(--surface-shell-1)] text-[var(--aluno-shell-texto)]">
        <div className="flex h-full items-center gap-3 pl-4 pr-4 sm:pl-5 lg:pr-12">
          <button
            ref={botaoNavegacaoRef}
            type="button"
            aria-expanded={navegacaoAberta}
            aria-controls="aluno-navegacao"
            aria-label={
              navegacaoAberta
                ? 'Fechar menu de navegação'
                : 'Abrir menu de navegação'
            }
            onClick={() =>
              setNavegacaoAberta((atual) => !atual)
            }
            className="aluno-foco-shell -ml-1 flex size-9 items-center justify-center rounded-lg text-[var(--aluno-shell-texto)] hover:bg-[var(--surface-shell-2)] lg:hidden"
          >
            <IconeMenu />
          </button>

          <Link
            to="/aluno"
            className="aluno-foco-shell brand-wordmark rounded text-lg font-semibold leading-6 tracking-[-0.09px] text-[var(--aluno-shell-texto)]"
          >
            LÉXIS
          </Link>

          <div className="ml-auto flex items-center gap-5 sm:gap-[34px]">
            <Link
              to="/aluno/notificacoes"
              aria-label={rotuloNotificacoes}
              className="aluno-foco-shell relative flex size-7 items-center justify-center rounded-lg bg-[var(--surface-shell-3)] text-[var(--aluno-shell-texto)] transition-colors hover:bg-[var(--surface-shell-4)]"
            >
              <IconeSino />

              {totalNaoLidas > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 left-[18px] flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--aluno-erro-solido)] px-[3px] text-[9px] font-medium leading-none text-[var(--aluno-shell-texto)]"
                >
                  {totalNaoLidas > 99
                    ? '99+'
                    : totalNaoLidas}
                </span>
              )}
            </Link>

            <MenuUsuario
              usuario={usuario}
              saindo={saindo}
              onSair={handleSair}
            />
          </div>
        </div>
      </header>

      {navegacaoAberta && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Fechar menu de navegação"
          onClick={fecharNavegacao}
          className="fixed inset-x-0 bottom-0 top-14 z-30 bg-[rgba(3,12,24,0.6)] lg:hidden"
        />
      )}

      <nav
        ref={navegacaoRef}
        id="aluno-navegacao"
        aria-label="Navegação do aluno"
        className={`fixed bottom-0 left-0 top-14 z-40 w-60 overflow-y-auto bg-[var(--surface-shell-1)] px-4 pt-6 transition-[translate,visibility] duration-200 ease-out lg:visible lg:translate-x-0 ${
          navegacaoAberta
            ? 'visible translate-x-0'
            : 'invisible -translate-x-full'
        }`}
      >
        <ul className="space-y-1.5">
          <li>
            <ItemNavegacao
              to="/aluno"
              end
              icone={<IconeInicio />}
              onNavegar={fecharNavegacao}
            >
              Início
            </ItemNavegacao>
          </li>
          <li>
            {rotaEnviarRedacao ? (
              <ItemNavegacao
                to={rotaEnviarRedacao}
                icone={<IconeEscrever />}
                onNavegar={fecharNavegacao}
              >
                Enviar redação
              </ItemNavegacao>
            ) : (
              <span
                role="link"
                aria-disabled="true"
                tabIndex={0}
                className={`${classeItemNavegacao} cursor-not-allowed text-[var(--aluno-shell-texto-suave)] opacity-55`}
              >
                <span className="text-[var(--aluno-shell-icone)]">
                  <IconeEscrever />
                </span>
                Enviar redação
                <span className="sr-only">
                  {' '}(indisponível: nenhuma proposta pendente)
                </span>
              </span>
            )}
          </li>
        </ul>
      </nav>

      <main
        id="conteudo-principal"
        tabIndex={-1}
        className="pt-14 outline-none lg:pl-60"
      >
        <div className="px-4 pb-16 pt-8 sm:px-6 lg:pl-10 lg:pr-8">
          <div className="max-w-[1128px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
