import axios from 'axios'

import {
  definirAccessToken,
  limparAccessToken,
  obterAccessToken,
} from './access-token.js'
import {
  notificarSessaoExpirada,
  notificarSessaoRestaurada,
} from './session-events.js'

const baseURL = import.meta.env.VITE_API_URL

if (!baseURL) {
  throw new Error(
    'A variável VITE_API_URL não foi configurada.',
  )
}

const configuracaoBase = {
  baseURL,
  timeout: 40000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
}

export const apiPublica = axios.create(
  configuracaoBase,
)

const api = axios.create(configuracaoBase)

api.interceptors.request.use((config) => {
  const accessToken = obterAccessToken()

  if (accessToken) {
    config.headers.Authorization =
      `Bearer ${accessToken}`
  }

  return config
})

let renovacaoEmAndamento = null

function endpointNaoRenovavel(url = '') {
  return [
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
  ].some((endpoint) => url.includes(endpoint))
}

export async function renovarSessaoApi() {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = apiPublica
      .post('/api/auth/refresh')
      .then((resposta) => {
        const sessao = resposta.data.data

        definirAccessToken(sessao.accessToken)
        notificarSessaoRestaurada()

        return sessao
      })
      .catch((error) => {
        limparAccessToken()
        throw error
      })
      .finally(() => {
        renovacaoEmAndamento = null
      })
  }

  return renovacaoEmAndamento
}

api.interceptors.response.use(
  (resposta) => resposta,

  async (error) => {
    const requisicaoOriginal = error.config

    const podeTentarRenovacao =
      error.response?.status === 401 &&
      requisicaoOriginal &&
      !requisicaoOriginal._tentativaRenovacao &&
      !endpointNaoRenovavel(
        requisicaoOriginal.url,
      )

    if (!podeTentarRenovacao) {
      return Promise.reject(error)
    }

    requisicaoOriginal._tentativaRenovacao = true

    try {
      const sessao = await renovarSessaoApi()

      requisicaoOriginal.headers.Authorization =
        `Bearer ${sessao.accessToken}`

      return api(requisicaoOriginal)
    } catch (refreshError) {
      limparAccessToken()
      notificarSessaoExpirada()

      return Promise.reject(refreshError)
    }
  },
)

export default api
