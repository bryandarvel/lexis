import { useEffect, useState } from 'react'

import { interpretarErroApi } from '../../utils/api-error.js'
import { MENSAGEM_REAUTENTICACAO } from '../../utils/reautenticacao.js'
import Aviso from '../base/Aviso.jsx'
import Botao from '../base/Botao.jsx'
import Dialogo from '../base/Dialogo.jsx'
import Campo from '../base/Campo.jsx'

// Sessão expirada: o diálogo não tem como ser dispensado (sem onFechar, o
// Escape não faz nada). Só dá para entrar de novo ou sair da conta.
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

  useEffect(() => {
    if (!aberto) {
      return
    }

    setDados((estadoAtual) => ({
      email: estadoAtual.email || emailInicial,
      senha: '',
    }))
    setErro('')
  }, [aberto, emailInicial])

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
    <Dialogo
      aberto={aberto}
      ocupado={enviando}
      titulo="Sua sessão expirou"
      descricao={MENSAGEM_REAUTENTICACAO}
    >
      <form onSubmit={autenticar} className="space-y-4">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Campo
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
        <Campo
          id="reauth-senha"
          name="senha"
          label="Senha"
          type="password"
          value={dados.senha}
          onChange={atualizarCampo}
          autoComplete="current-password"
          required
        />

        <div className="dialogo-base__rodape">
          <Botao variante="secundario" onClick={encerrarSessao} disabled={enviando}>
            Sair da conta
          </Botao>
          <Botao type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar e continuar'}
          </Botao>
        </div>
      </form>
    </Dialogo>
  )
}
