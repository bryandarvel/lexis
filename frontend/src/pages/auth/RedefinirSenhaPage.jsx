import Botao from '../../components/base/Botao.jsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Campo from '../../components/base/Campo.jsx'
import Aviso from '../../components/base/Aviso.jsx'
import ThemeToggle from '../../components/layout/ThemeToggle.jsx'
import logo from '../../assets/lexis-logo-login.svg'
import { useAuth } from '../../hooks/useAuth.js'
import { redefinirSenha } from '../../services/password-recovery.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import { obterTokenRecuperacao, validarNovaSenha } from '../../utils/password-recovery.js'
import { REGRA_SENHA } from '../../utils/senha.js'
import './login.css'

export default function RedefinirSenhaPage() {
  const [token, setToken] = useState(() => obterTokenRecuperacao(window.location.hash))
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const { sair } = useAuth()

  useEffect(() => {
    // O fragmento nunca é enviado ao servidor e é removido do histórico visível.
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  async function enviar(event) {
    event.preventDefault()
    if (enviando || !token) return
    const validacao = validarNovaSenha(senha, confirmacao)
    setErro(validacao)
    if (validacao) return
    setEnviando(true)
    try {
      await redefinirSenha({ token, senha })
      await sair().catch(() => {})
      setSenha('')
      setConfirmacao('')
      setToken('')
      setConcluido(true)
    } catch (error) {
      setErro(interpretarErroApi(error, 'Não foi possível redefinir a senha. Tente novamente.').mensagem)
    } finally {
      setEnviando(false)
    }
  }

  return <main className="login-page">
    <section className="login-brand" aria-label="LÉXIS"><img className="login-logo" src={logo} alt="LÉXIS" /></section>
    <section className="login-access" aria-labelledby="reset-title">
      <div className="login-theme"><ThemeToggle /></div>
      <div className="login-card">
        <h1 id="reset-title">Definir nova senha</h1>
        <p className="login-description">Após a redefinição, entre novamente com sua nova senha.</p>
        {concluido ? <Aviso tipo="sucesso">Senha redefinida. As sessões anteriores foram encerradas.</Aviso> : !token ? <Aviso tipo="erro">Link inválido ou ausente. Volte ao login e solicite uma nova recuperação.</Aviso> :
          <form className="login-form" onSubmit={enviar} aria-busy={enviando}>
            <p id="reset-rules" className="login-description">{REGRA_SENHA}</p>
            <Campo id="reset-password" label="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={e => setSenha(e.target.value)} minLength={10} maxLength={72} aria-describedby="reset-rules" disabled={enviando} required />
            <Campo id="reset-confirmation" label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} minLength={10} maxLength={72} disabled={enviando} required />
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao type="submit" className="min-h-12 w-full" carregando={enviando} rotuloCarregando="Redefinindo...">Redefinir senha</Botao>
          </form>}
        <Botao as={Link} variante="fantasma" to="/login">Voltar para entrar</Botao>
      </div>
    </section>
  </main>
}
