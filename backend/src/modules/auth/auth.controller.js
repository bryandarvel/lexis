import {
  REFRESH_TOKEN_COOKIE_NAME,
  criarOpcoesLimparRefreshCookie,
  criarOpcoesRefreshCookie,
} from './auth-cookie.js'
import {
  autenticarUsuario,
  cadastrarUsuario,
  encerrarSessao,
  obterUsuarioAtual,
  renovarSessao,
} from './auth.service.js'

export async function cadastrarUsuarioController(req, res) {
  const usuario = await cadastrarUsuario(req.body)

  return res.status(201).json({
    data: {
      usuario,
    },
  })
}

export async function loginController(req, res) {
  const sessao = await autenticarUsuario(req.body)

  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    sessao.refreshToken,
    criarOpcoesRefreshCookie(
      sessao.refreshTokenExpiraEm,
    ),
  )

  return res.status(200).json({
    data: {
      usuario: sessao.usuario,
      accessToken: sessao.accessToken,
    },
  })
}

export async function renovarSessaoController(req, res) {
  const refreshTokenAtual =
    req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]

  try {
    const sessao = await renovarSessao(refreshTokenAtual)

    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      sessao.refreshToken,
      criarOpcoesRefreshCookie(
        sessao.refreshTokenExpiraEm,
      ),
    )

    return res.status(200).json({
      data: {
        usuario: sessao.usuario,
        accessToken: sessao.accessToken,
      },
    })
  } catch (error) {
    res.clearCookie(
      REFRESH_TOKEN_COOKIE_NAME,
      criarOpcoesLimparRefreshCookie(),
    )

    throw error
  }
}

export async function logoutController(req, res) {
  const refreshTokenAtual =
    req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]

  try {
    await encerrarSessao(refreshTokenAtual)
  } finally {
    res.clearCookie(
      REFRESH_TOKEN_COOKIE_NAME,
      criarOpcoesLimparRefreshCookie(),
    )
  }

  return res.status(204).send()
}

export async function obterUsuarioAtualController(
  req,
  res,
) {
  const usuario = await obterUsuarioAtual(
    req.auth.usuarioId,
  )

  return res.status(200).json({
    data: {
      usuario,
    },
  })
}