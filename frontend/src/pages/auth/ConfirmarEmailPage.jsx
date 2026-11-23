import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import CascaEntrada from '../../components/auth/CascaEntrada.jsx'
import Aviso from '../../components/base/Aviso.jsx'
import Botao from '../../components/base/Botao.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { confirmarTrocaEmail } from '../../services/conta.js'
import { obterTokenRecuperacao } from '../../utils/password-recovery.js'

const LINK_INVALIDO = 'Este link é inválido, expirou ou já foi usado. Para obter outro, entre na sua conta e solicite a alteração novamente.'

export default function ConfirmarEmailPage() {
  const [token, setToken] = useState(() => obterTokenRecuperacao(window.location.hash))
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const voltarRef = useRef(null)
  const navigate = useNavigate()
  const { encerrarSessaoLocal, carregando } = useAuth()

  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])

  useEffect(() => {
    if (!token && erro) voltarRef.current?.focus()
  }, [token, erro])

  async function confirmar(evento) {
    evento.preventDefault()
    if (carregando || enviandoRef.current || !token) return
    enviandoRef.current = true
    setEnviando(true)
    setErro('')
    try {
      await confirmarTrocaEmail(token)
      setToken('')
      encerrarSessaoLocal()
      navigate('/login', { replace: true, state: { emailConfirmado: true } })
    } catch (falha) {
      const resposta = falha?.response
      const codigo = resposta?.data?.error?.code
      if (codigo === 'EMAIL_CHANGE_INVALID' || resposta?.status === 422) {
        setToken('')
        setErro(LINK_INVALIDO)
      } else if (codigo === 'EMAIL_ALREADY_IN_USE') {
        setToken('')
        setErro('Esse endereço já está em uso. Entre com o endereço anterior e solicite a troca para outro e-mail.')
      } else if (resposta?.status === 429) {
        setErro('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
      } else {
        setErro('Não foi possível confirmar o e-mail agora. Verifique a conexão e tente novamente.')
      }
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <CascaEntrada titulo="Confirmar novo e-mail" descricao={token ? 'Ao confirmar, você passará a entrar com o novo endereço. As sessões anteriores serão encerradas.' : undefined}>
      {(!token || erro) && <Aviso tipo="erro">{erro || LINK_INVALIDO}</Aviso>}
      {token && <form className="login-form" onSubmit={confirmar}>
        <Botao type="submit" className="min-h-12 w-full" disabled={carregando} carregando={enviando}
          rotuloCarregando="Confirmando…">Confirmar e-mail</Botao>
      </form>}
      <Botao ref={voltarRef} as={Link} variante="fantasma" to="/login">Voltar para entrar</Botao>
    </CascaEntrada>
  )
}
