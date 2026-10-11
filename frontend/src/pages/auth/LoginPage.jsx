import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router'

import AuthField from '../../components/auth/AuthField.jsx'
import AuthNotice from '../../components/auth/AuthNotice.jsx'
import PasswordRecoveryDialog from '../../components/auth/PasswordRecoveryDialog.jsx'
import ThemeToggle from '../../components/layout/ThemeToggle.jsx'
import logo from '../../assets/lexis-logo-login.svg'
import './login.css'
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
  const [papel, setPapel] = useState('PROFESSOR')
  const [recuperacaoAberta, setRecuperacaoAberta] = useState(false)

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
    <main className="login-page">
      <section className="login-brand" aria-label="LÉXIS">
        <img src={logo} alt="LÉXIS" className="login-logo" />
      </section>
      <section className="login-access" aria-label="Acesso à plataforma">
        <div className="login-theme"><ThemeToggle compacto /></div>
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <h1>Bem-vindo(a) ao LÉXIS</h1>
          <p className="login-description">Acesse sua conta para continuar</p>
          <nav className="login-tabs" aria-label="Acesso à conta">
            <span aria-current="page">Entrar</span>
            <Link to="/cadastro" state={{ papel }}>Criar conta</Link>
          </nav>
      <form
        onSubmit={enviarFormulario}
        className="login-form"
        aria-busy={enviando}
      >
        <fieldset className="login-roles" disabled={enviando}>
          <legend>Você acessa como</legend>
          <div>
            {[
              ['PROFESSOR', 'Professor'],
              ['ALUNO', 'Aluno'],
            ].map(([valor, rotulo]) => (
              <label key={valor} className={papel === valor ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="perfil"
                  value={valor}
                  checked={papel === valor}
                  onChange={() => setPapel(valor)}
                />
                <span>{rotulo}</span>
              </label>
            ))}
          </div>
        </fieldset>
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
          label="E-mail institucional"
          type="email"
          value={dados.email}
          onChange={atualizarCampo}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ana.lima@escola.edu.br"
          required
          maxLength={191}
        />

        <div className="login-password">
          <button
            type="button"
            className="login-forgot"
            onClick={() => setRecuperacaoAberta(true)}
            disabled={enviando}
          >
            Esqueci minha senha
          </button>
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
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="login-submit"
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
        </motion.div>
      </section>
      <PasswordRecoveryDialog
        aberto={recuperacaoAberta}
        emailInicial={dados.email}
        onClose={() => setRecuperacaoAberta(false)}
      />
    </main>
  )
}
