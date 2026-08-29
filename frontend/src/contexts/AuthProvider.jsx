import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import ReauthenticationDialog from '../components/auth/ReauthenticationDialog.jsx'
import {
  limparAccessToken,
  definirAccessToken,
} from '../services/access-token.js'
import {
  apiPublica,
  renovarSessaoApi,
} from '../services/api.js'
import {
  EVENTO_SESSAO_EXPIRADA,
  notificarSessaoRestaurada,
} from '../services/session-events.js'
import { AuthContext } from './auth-context.js'
import { limparRascunhosUsuario } from '../utils/draft-storage.js'

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [status, setStatus] = useState('carregando')
  const [reautenticacaoAberta, setReautenticacaoAberta] =
    useState(false)

  useEffect(() => {
    let componenteAtivo = true

    async function restaurarSessao() {
      try {
        const sessao = await renovarSessaoApi()

        if (componenteAtivo) {
          setUsuario(sessao.usuario)
        }
      } catch {
        limparAccessToken()

        if (componenteAtivo) {
          setUsuario(null)
        }
      } finally {
        if (componenteAtivo) {
          setStatus('pronto')
        }
      }
    }

    restaurarSessao()

    return () => {
      componenteAtivo = false
    }
  }, [])

  useEffect(() => {
    function solicitarReautenticacao() {
      setReautenticacaoAberta(true)
    }

    globalThis.addEventListener(
      EVENTO_SESSAO_EXPIRADA,
      solicitarReautenticacao,
    )

    return () => {
      globalThis.removeEventListener(
        EVENTO_SESSAO_EXPIRADA,
        solicitarReautenticacao,
      )
    }
  }, [])

  const entrar = useCallback(async ({ email, senha }) => {
    const resposta = await apiPublica.post(
      '/api/auth/login',
      {
        email,
        senha,
      },
    )

    const sessao = resposta.data.data

    definirAccessToken(sessao.accessToken)
    notificarSessaoRestaurada()
    setUsuario(sessao.usuario)
    setStatus('pronto')
    setReautenticacaoAberta(false)

    return sessao.usuario
  }, [])

  const cadastrar = useCallback(
    async ({ nome, email, senha, papel }) => {
      const resposta = await apiPublica.post(
        '/api/auth/cadastro',
        {
          nome,
          email,
          senha,
          papel,
        },
      )

      return resposta.data.data.usuario
    },
    [],
  )

  const sair = useCallback(async () => {
    try {
      await apiPublica.post('/api/auth/logout')
    } finally {
      limparRascunhosUsuario(usuario?.id)
      limparAccessToken()
      notificarSessaoRestaurada()
      setUsuario(null)
      setStatus('pronto')
      setReautenticacaoAberta(false)
    }
  }, [usuario?.id])

  const valorContexto = useMemo(
    () => ({
      usuario,
      autenticado: Boolean(usuario),
      carregando: status === 'carregando',
      entrar,
      cadastrar,
      sair,
    }),
    [
      usuario,
      status,
      entrar,
      cadastrar,
      sair,
    ],
  )

  return (
    <AuthContext.Provider value={valorContexto}>
      {children}
      <ReauthenticationDialog
        aberto={reautenticacaoAberta}
        emailInicial={usuario?.email ?? ''}
        onAuthenticate={entrar}
        onLogout={sair}
      />
    </AuthContext.Provider>
  )
}
