import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { interpretarErroApi } from '../../utils/api-error.js'
import AuthField from './AuthField.jsx'
import AuthNotice from './AuthNotice.jsx'

export default function ReauthenticationDialog({
  aberto,
  emailInicial = '',
  onAuthenticate,
  onLogout,
}) {
  const [dados, setDados] = useState({
    email: emailInicial,
    senha: '',
  })
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const dialogRef = useRef(null)
  const tituloRef = useRef(null)

  useEffect(() => {
    if (!aberto) {
      return undefined
    }

    const focoAnterior = document.activeElement
    setDados((estadoAtual) => ({
      email: estadoAtual.email || emailInicial,
      senha: '',
    }))
    setErro('')
    tituloRef.current?.focus()

    function manterFoco(event) {
      if (event.key !== 'Tab') {
        return
      }

      const focaveis = Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled])',
        ) ?? [],
      )

      if (focaveis.length === 0) {
        event.preventDefault()
        tituloRef.current?.focus()
        return
      }

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]

      if (
        event.shiftKey &&
        document.activeElement === primeiro
      ) {
        event.preventDefault()
        ultimo.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === ultimo
      ) {
        event.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', manterFoco)

    return () => {
      document.removeEventListener('keydown', manterFoco)
      focoAnterior?.focus?.()
    }
  }, [aberto, emailInicial])

  if (!aberto) {
    return null
  }

  function atualizarCampo(event) {
    const { name, value } = event.target

    setDados((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }))
    setErro('')
  }

  async function autenticar(event) {
    event.preventDefault()

    if (enviando) {
      return
    }

    setEnviando(true)
    setErro('')

    try {
      await onAuthenticate(dados)
    } catch (error) {
      setErro(
        interpretarErroApi(
          error,
          'Não foi possível reautenticar. Tente novamente.',
        ).mensagem,
      )
    } finally {
      setEnviando(false)
    }
  }

  async function encerrarSessao() {
    if (enviando) {
      return
    }

    setEnviando(true)

    try {
      await onLogout()
    } catch {
      // O estado local é limpo pelo AuthProvider mesmo se a API falhar.
    }
  }

  return (
    <div className="reauth-backdrop">
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-reauth"
        aria-describedby="descricao-reauth"
        className="reauth-dialog surface-card"
      >
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-lexis-300">
          Segurança da sessão
        </p>
        <h2
          id="titulo-reauth"
          ref={tituloRef}
          tabIndex={-1}
          className="mt-3 text-2xl font-semibold text-lexis-50"
        >
          Sua sessão expirou
        </h2>
        <p
          id="descricao-reauth"
          className="mt-3 leading-7 text-lexis-200"
        >
          Entre novamente para continuar. Sua correção foi salva localmente e esta tela será preservada. Se uma ação falhou, você poderá repeti-la com segurança.
        </p>

        <form onSubmit={autenticar} className="mt-6 space-y-4">
          <AuthNotice mensagem={erro} />
          <AuthField
            id="reauth-email"
            name="email"
            label="E-mail"
            type="email"
            value={dados.email}
            onChange={atualizarCampo}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          <AuthField
            id="reauth-senha"
            name="senha"
            label="Senha"
            type="password"
            value={dados.senha}
            onChange={atualizarCampo}
            autoComplete="current-password"
            required
          />

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={encerrarSessao}
              disabled={enviando}
              className="rounded-[10px] border border-lexis-300/35 px-4 py-3 font-bold text-lexis-100"
            >
              Sair da conta
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-[10px] bg-lexis-400 px-4 py-3 font-bold text-white disabled:opacity-60"
            >
              {enviando ? 'Entrando...' : 'Entrar e continuar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
