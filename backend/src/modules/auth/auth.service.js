import { randomUUID } from 'node:crypto'

import { AppError } from '../../utils/app-error.js'
import {
  buscarRefreshTokenPorHash,
  buscarUsuarioPorEmail,
  buscarUsuarioPublicoPorId,
  criarUsuario,
  revogarFamiliaRefreshTokens,
  rotacionarRefreshToken,
  salvarRefreshToken,
} from './auth.repository.js'

import {
  criarAccessToken,
  criarHashToken,
  criarRefreshToken,
  obterExpiracaoToken,
  verificarRefreshToken,
} from './auth-token.service.js'
import {
  criarHashSenha,
  verificarSenha,
} from './password.service.js'

function criarErroEmailEmUso() {
  return new AppError('Este e-mail já está cadastrado.', {
    statusCode: 409,
    code: 'EMAIL_ALREADY_IN_USE',
  })
}

function criarErroCredenciaisInvalidas() {
  return new AppError('E-mail ou senha inválidos.', {
    statusCode: 401,
    code: 'INVALID_CREDENTIALS',
  })
}

function criarErroRefreshInvalido() {
  return new AppError(
    'Sessão inválida ou expirada. Faça login novamente.',
    {
      statusCode: 401,
      code: 'REFRESH_TOKEN_INVALID',
    },
  )
}

function criarErroReutilizacaoRefresh() {
  return new AppError(
    'Reutilização de sessão detectada. Faça login novamente.',
    {
      statusCode: 401,
      code: 'REFRESH_TOKEN_REUSE_DETECTED',
    },
  )
}

function criarUsuarioPublico(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    ativo: usuario.ativo,
    criadoEm: usuario.criadoEm,
    atualizadoEm: usuario.atualizadoEm,
  }
}

export async function cadastrarUsuario({
  nome,
  email,
  senha,
  papel,
}) {
  const usuarioExistente = await buscarUsuarioPorEmail(email)

  if (usuarioExistente) {
    throw criarErroEmailEmUso()
  }

  const senhaHash = await criarHashSenha(senha)

  try {
    return await criarUsuario({
      nome,
      email,
      senhaHash,
      papel,
    })
  } catch (error) {
    if (error?.code === 'P2002') {
      throw criarErroEmailEmUso()
    }

    throw error
  }
}

export async function autenticarUsuario({ email, senha }) {
  const usuario = await buscarUsuarioPorEmail(email)

  if (!usuario || !usuario.ativo) {
    throw criarErroCredenciaisInvalidas()
  }

  const senhaCorreta = await verificarSenha(
    senha,
    usuario.senhaHash,
  )

  if (!senhaCorreta) {
    throw criarErroCredenciaisInvalidas()
  }

  const familiaId = randomUUID()

  const accessToken = criarAccessToken({
    usuarioId: usuario.id,
    papel: usuario.papel,
  })

  const refreshToken = criarRefreshToken({
    usuarioId: usuario.id,
    familiaId,
  })

  const refreshTokenExpiraEm =
    obterExpiracaoToken(refreshToken)

  await salvarRefreshToken({
    tokenHash: criarHashToken(refreshToken),
    familiaId,
    usuarioId: usuario.id,
    expiraEm: refreshTokenExpiraEm,
  })

  return {
    usuario: criarUsuarioPublico(usuario),
    accessToken,
    refreshToken,
    refreshTokenExpiraEm,
  }
}

export async function renovarSessao(refreshTokenAtual) {
  const payload = verificarRefreshToken(
    refreshTokenAtual,
  )

  const tokenRegistrado = await buscarRefreshTokenPorHash(
    criarHashToken(refreshTokenAtual),
  )

  const registroInconsistente =
    !tokenRegistrado ||
    tokenRegistrado.familiaId !== payload.familiaId ||
    tokenRegistrado.usuarioId !== payload.sub

  if (registroInconsistente || tokenRegistrado.revogadoEm) {
    await revogarFamiliaRefreshTokens(payload.familiaId)

    throw criarErroReutilizacaoRefresh()
  }

  if (
    tokenRegistrado.expiraEm.getTime() <= Date.now() ||
    !tokenRegistrado.usuario.ativo
  ) {
    await revogarFamiliaRefreshTokens(payload.familiaId)

    throw criarErroRefreshInvalido()
  }

  const novoAccessToken = criarAccessToken({
    usuarioId: tokenRegistrado.usuario.id,
    papel: tokenRegistrado.usuario.papel,
  })

  const novoRefreshToken = criarRefreshToken({
    usuarioId: tokenRegistrado.usuario.id,
    familiaId: tokenRegistrado.familiaId,
  })

  const novoRefreshTokenExpiraEm =
    obterExpiracaoToken(novoRefreshToken)

  const rotacaoRealizada = await rotacionarRefreshToken({
    tokenAtualId: tokenRegistrado.id,
    novoTokenHash: criarHashToken(novoRefreshToken),
    familiaId: tokenRegistrado.familiaId,
    usuarioId: tokenRegistrado.usuario.id,
    expiraEm: novoRefreshTokenExpiraEm,
  })

  if (!rotacaoRealizada) {
    await revogarFamiliaRefreshTokens(
      tokenRegistrado.familiaId,
    )

    throw criarErroReutilizacaoRefresh()
  }

  return {
    usuario: criarUsuarioPublico(tokenRegistrado.usuario),
    accessToken: novoAccessToken,
    refreshToken: novoRefreshToken,
    refreshTokenExpiraEm: novoRefreshTokenExpiraEm,
  }
}

export async function encerrarSessao(refreshTokenAtual) {
  if (!refreshTokenAtual) {
    return
  }

  let payload

  try {
    payload = verificarRefreshToken(refreshTokenAtual)
  } catch {
    return
  }

  const tokenRegistrado = await buscarRefreshTokenPorHash(
    criarHashToken(refreshTokenAtual),
  )

  const registroInconsistente =
    !tokenRegistrado ||
    tokenRegistrado.familiaId !== payload.familiaId ||
    tokenRegistrado.usuarioId !== payload.sub

  if (registroInconsistente) {
    return
  }

  await revogarFamiliaRefreshTokens(
    tokenRegistrado.familiaId,
  )
}

export async function obterUsuarioAtual(usuarioId) {
  const usuario = await buscarUsuarioPublicoPorId(
    usuarioId,
  )

  if (!usuario || !usuario.ativo) {
    throw new AppError(
      'O usuário desta sessão não está disponível.',
      {
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
      },
    )
  }

  return usuario
}