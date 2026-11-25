import Botao from '../../components/base/Botao.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Campo from '../../components/base/Campo.jsx'
import Aviso from '../../components/base/Aviso.jsx'
import CascaEntrada from '../../components/auth/CascaEntrada.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { redefinirSenha } from '../../services/password-recovery.js'
import { interpretarErroApi } from '../../utils/api-error.js'
import { obterTokenRecuperacao, validarNovaSenha } from '../../utils/password-recovery.js'
import { REGRA_SENHA } from '../../utils/senha.js'

export default function RedefinirSenhaPage() {
  const [token, setToken] = useState(() => obterTokenRecuperacao(window.location.hash))
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const { encerrarSessaoLocal, carregando } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // O fragmento nunca é enviado ao servidor e é removido do histórico visível.
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  async function enviar(event) {
    event.preventDefault()
    if (carregando || enviandoRef.current || !token) return
    const validacao = validarNovaSenha(senha, confirmacao)
    setErro(validacao)
    if (validacao) return
    enviandoRef.current = true
    setEnviando(true)
    try {
      await redefinirSenha({ token, senha })
      setSenha('')
      setConfirmacao('')
      setToken('')
      encerrarSessaoLocal()
      navigate('/login', { replace: true, state: { senhaRedefinida: true } })
    } catch (error) {
      setErro(interpretarErroApi(error, 'Não foi possível redefinir a senha. Tente novamente.').mensagem)
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return <CascaEntrada titulo="Definir nova senha" descricao="Após a redefinição, entre novamente com sua nova senha.">
        {!token ? <Aviso tipo="erro">Link inválido ou ausente. Volte ao login e solicite uma nova recuperação.</Aviso> :
          <form className="login-form" onSubmit={enviar} aria-busy={enviando}>
            <p id="reset-rules" className="login-description">{REGRA_SENHA}</p>
            <Campo id="reset-password" label="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={e => setSenha(e.target.value)} minLength={10} maxLength={72} aria-describedby="reset-rules" disabled={enviando} required />
            <Campo id="reset-confirmation" label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} minLength={10} maxLength={72} disabled={enviando} required />
            {erro && <Aviso tipo="erro">{erro}</Aviso>}
            <Botao type="submit" className="min-h-12 w-full" disabled={carregando} carregando={enviando} rotuloCarregando="Redefinindo…">Redefinir senha</Botao>
          </form>}
        <Botao as={Link} variante="fantasma" to="/login">Voltar para entrar</Botao>
  </CascaEntrada>
}
