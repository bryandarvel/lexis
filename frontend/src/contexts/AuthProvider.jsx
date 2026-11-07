import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { descartarRevisaoOcr } from '../services/revisao-ocr-pendente.js'
import {
  EVENTO_SESSAO_EXPIRADA,
  notificarSessaoRestaurada,
} from '../services/session-events.js'
import { AuthContext } from './auth-context.js'
import { limparRascunhosUsuario } from '../utils/draft-storage.js'
import { deveDescartarRevisaoOcr } from '../utils/sessao-ocr.js'

export default function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [status, setStatus] = useState('carregando')
  const [reautenticacaoAberta, setReautenticacaoAberta] =
    useState(false)
  // Lido dentro de entrar sem recriar o callback a cada troca de usuário.
  const usuarioIdRef = useRef(null)

  useEffect(() => {
    usuarioIdRef.current = usuario?.id ?? null
  }, [usuario?.id])

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

    // A reautenticação aceita outro e-mail: quando a conta muda de fato, a
    // revisão de OCR da anterior não pode seguir em memória (#49).
    if (
      deveDescartarRevisaoOcr(
        usuarioIdRef.current,
        sessao.usuario?.id,
      )
    ) {
      descartarRevisaoOcr()
    }

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
      descartarRevisaoOcr()
      limparAccessToken()
      notificarSessaoRestaurada()
      setUsuario(null)
      setStatus('pronto')
      setReautenticacaoAberta(false)
    }
  }, [usuario?.id])

  // Usado depois de PATCH /auth/me e POST /auth/alterar-senha: a troca de
  // senha devolve um access token novo, e a sessão atual continua valendo.
  const atualizarSessao = useCallback(
    ({ usuario: usuarioAtualizado, accessToken } = {}) => {
      if (accessToken) {
        definirAccessToken(accessToken)
      }

      if (usuarioAtualizado) {
        setUsuario(usuarioAtualizado)
      }
    },
    [],
  )

  const valorContexto = useMemo(
    () => ({
      usuario,
      autenticado: Boolean(usuario),
      carregando: status === 'carregando',
      entrar,
      cadastrar,
      sair,
      atualizarSessao,
    }),
    [
      usuario,
      status,
      entrar,
      cadastrar,
      sair,
      atualizarSessao,
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
