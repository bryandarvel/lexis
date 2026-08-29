import { useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'

import AuthField from '../../components/auth/AuthField.jsx'
import AuthNotice from '../../components/auth/AuthNotice.jsx'
import AuthShell from '../../components/auth/AuthShell.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { interpretarErroApi } from '../../utils/api-error.js'

function obterRotaInicial(papel) {
  return papel === 'PROFESSOR'
    ? '/professor'
    : '/aluno'
}

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { entrar } = useAuth()

  const [dados, setDados] = useState({
    email: location.state?.email ?? '',
    senha: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const cadastroConcluido = Boolean(
    location.state?.cadastroConcluido,
  )

  function atualizarCampo(event) {
    const { name, value } = event.target

    setDados((estadoAtual) => ({
      ...estadoAtual,
      [name]: value,
    }))
    setErro('')
  }

  async function enviarFormulario(event) {
    event.preventDefault()

    if (enviando) {
      return
    }

    setEnviando(true)
    setErro('')

    try {
      const usuario = await entrar(dados)

      navigate(obterRotaInicial(usuario.papel), {
        replace: true,
      })
    } catch (error) {
      const erroInterpretado = interpretarErroApi(
        error,
        'Não foi possível entrar. Tente novamente.',
      )

      setErro(erroInterpretado.mensagem)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Acesso à plataforma"
      title="Bem-vindo de volta"
      description="Entre para acompanhar turmas, redações e feedbacks."
      footer={
        <p>
          Ainda não possui uma conta?{' '}
          <Link
            to="/cadastro"
            className="font-bold text-lexis-200 underline decoration-lexis-400/60 underline-offset-4 transition hover:text-lexis-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lexis-300"
          >
            Criar conta
          </Link>
        </p>
      }
    >
      <form
        onSubmit={enviarFormulario}
        className="space-y-5"
        aria-busy={enviando}
      >
        <AuthNotice
          tipo="sucesso"
          mensagem={
            cadastroConcluido
              ? 'Conta criada com sucesso. Agora você já pode entrar.'
              : ''
          }
        />
        <AuthNotice mensagem={erro} />

        <AuthField
          id="email"
          name="email"
          label="E-mail"
          type="email"
          value={dados.email}
          onChange={atualizarCampo}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="voce@exemplo.com"
          required
          maxLength={191}
        />

        <AuthField
          id="senha"
          name="senha"
          label="Senha"
          type="password"
          value={dados.senha}
          onChange={atualizarCampo}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          required
          maxLength={72}
        />

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-lexis-400 px-5 py-3.5 font-bold text-lexis-950 shadow-lg shadow-lexis-500/20 transition hover:bg-lexis-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lexis-300/35 disabled:cursor-not-allowed disabled:opacity-65"
        >
          {enviando && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-lexis-950/25 border-t-lexis-950 motion-reduce:animate-none"
            />
          )}
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  )
}
