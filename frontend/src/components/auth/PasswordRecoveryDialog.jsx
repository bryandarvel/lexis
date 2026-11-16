import { useEffect, useState } from 'react'

import AuthField from './AuthField.jsx'
import Aviso from '../base/Aviso.jsx'
import Botao from '../base/Botao.jsx'
import Dialogo from '../base/Dialogo.jsx'
import { interpretarErroApi } from '../../utils/api-error.js'

export default function PasswordRecoveryDialog({
  aberto,
  emailInicial = '',
  onClose,
  onRequestRecovery,
}) {
  const [email, setEmail] = useState(emailInicial)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setEmail(emailInicial)
    setErro('')
    setConcluido(false)
  }, [aberto, emailInicial])

  async function solicitarRecuperacao(event) {
    event.preventDefault()
    if (!onRequestRecovery || enviando) return
    setEnviando(true)
    setErro('')
    try {
      await onRequestRecovery({ email: email.trim() })
      setConcluido(true)
    } catch (error) {
      setErro(interpretarErroApi(error, 'Não foi possível solicitar a recuperação. Tente novamente.').mensagem)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      ocupado={enviando}
      onFechar={() => { if (!enviando) onClose() }}
      titulo="Recuperar senha"
      descricao="Informe o e-mail da sua conta para solicitar a recuperação."
    >
      <form onSubmit={solicitarRecuperacao} className="login-form space-y-4" aria-busy={enviando}>
        <AuthField
          id="recovery-email"
          label="E-mail institucional"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={191}
          required
          disabled={enviando || concluido}
        />
        {!onRequestRecovery && (
          <Aviso tipo="info">
            A recuperação de senha ainda não está disponível. O envio de instruções será habilitado após a integração com o serviço de recuperação.
          </Aviso>
        )}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        {concluido && (
          <Aviso tipo="sucesso">
            Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.
          </Aviso>
        )}
        <div className="dialogo-base__rodape">
          <Botao variante="secundario" disabled={enviando} onClick={onClose}>
            Voltar para entrar
          </Botao>
          <Botao
            type="submit"
            disabled={!onRequestRecovery || concluido}
            carregando={enviando}
            rotuloCarregando="Solicitando..."
          >
            Enviar instruções
          </Botao>
        </div>
      </form>
    </Dialogo>
  )
}
