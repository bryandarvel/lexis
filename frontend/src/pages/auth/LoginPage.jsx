import Botao from '../../components/base/Botao.jsx'
import { useState } from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

import Campo from '../../components/base/Campo.jsx'
import Aviso from '../../components/base/Aviso.jsx'
import CascaEntrada from '../../components/auth/CascaEntrada.jsx'
import PasswordRecoveryDialog from '../../components/auth/PasswordRecoveryDialog.jsx'
import { solicitarRecuperacaoSenha } from '../../services/password-recovery.js'
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
    <CascaEntrada
      titulo="Bem-vindo(a) ao LÉXIS"
      descricao="Acesse sua conta para continuar"
      aba="entrar"
    >
      <form
        onSubmit={enviarFormulario}
        className="login-form"
        aria-busy={enviando}
      >
        {cadastroConcluido && (
          <Aviso tipo="sucesso">Conta criada com sucesso. Agora você já pode entrar.</Aviso>
        )}
        {location.state?.emailConfirmado && <Aviso tipo="sucesso">E-mail confirmado. Entre com o novo endereço.</Aviso>}
        {location.state?.senhaRedefinida && <Aviso tipo="sucesso">Senha redefinida. Entre com a nova senha.</Aviso>}
        {location.state?.contaExcluida && <Aviso tipo="sucesso">Conta excluída. O acesso foi encerrado.</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <Campo
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
        <Campo
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

        <Botao
          type="submit"
          className="min-h-12 w-full"
          carregando={enviando}
          rotuloCarregando="Entrando…"
        >
          Entrar
        </Botao>
      </form>
      <PasswordRecoveryDialog
        onRequestRecovery={solicitarRecuperacaoSenha}
        aberto={recuperacaoAberta}
        emailInicial={dados.email}
        onClose={() => setRecuperacaoAberta(false)}
      />
    </CascaEntrada>
  )
}
