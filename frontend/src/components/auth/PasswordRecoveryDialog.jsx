import { useEffect, useRef, useState } from 'react'

import AuthField from './AuthField.jsx'
import AuthNotice from './AuthNotice.jsx'
import { interpretarErroApi } from '../../utils/api-error.js'

export default function PasswordRecoveryDialog({
  aberto,
  emailInicial = '',
  onClose,
  onRequestRecovery,
}) {
  const dialogRef = useRef(null)
  const [email, setEmail] = useState(emailInicial)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!aberto) {
      dialog?.close()
      return
    }
    setEmail(emailInicial)
    setErro('')
    setConcluido(false)
    const focoAnterior = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      focoAnterior?.focus?.()
    }
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
    <dialog
      ref={dialogRef}
      className="login-recovery login-card"
      aria-labelledby="recovery-title"
      aria-describedby="recovery-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!enviando) onClose()
      }}
    >
      <h2 id="recovery-title">Recuperar senha</h2>
      <p id="recovery-description" className="login-description">
        Informe o e-mail da sua conta para solicitar a recuperação.
      </p>
      <form onSubmit={solicitarRecuperacao} className="login-form" aria-busy={enviando}>
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
          <p className="login-recovery-pending" role="status">
            A recuperação de senha ainda não está disponível. O envio de instruções será habilitado após a integração com o serviço de recuperação.
          </p>
        )}
        <AuthNotice mensagem={erro} />
        <AuthNotice
          tipo="sucesso"
          mensagem={concluido ? 'Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.' : ''}
        />
        <button className="login-submit" disabled={!onRequestRecovery || enviando || concluido} type="submit">
          {enviando ? 'Solicitando...' : 'Enviar instruções'}
        </button>
        <button type="button" className="login-back" disabled={enviando} onClick={onClose}>
          Voltar para entrar
        </button>
      </form>
    </dialog>
  )
}
