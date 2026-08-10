import { AppError } from '../utils/app-error.js'

const PAPEIS_SUPORTADOS = new Set([
  'PROFESSOR',
  'ALUNO',
])

function criarErroAutenticacaoNecessaria() {
  return new AppError(
    'É necessário estar autenticado para acessar este recurso.',
    {
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    },
  )
}

function criarErroPermissaoInsuficiente() {
  return new AppError(
    'Você não possui permissão para acessar este recurso.',
    {
      statusCode: 403,
      code: 'FORBIDDEN',
    },
  )
}

export function autorizarPapeis(...papeisPermitidos) {
  const configuracaoInvalida =
    papeisPermitidos.length === 0 ||
    papeisPermitidos.some(
      (papel) => !PAPEIS_SUPORTADOS.has(papel),
    )

  if (configuracaoInvalida) {
    throw new TypeError(
      'Informe pelo menos um papel de usuário válido.',
    )
  }

  const papeisPermitidosSet = new Set(
    papeisPermitidos,
  )

  return function autorizarPapel(req, _res, next) {
    const papelUsuario = req.auth?.papel

    if (!papelUsuario) {
      return next(criarErroAutenticacaoNecessaria())
    }

    if (!papeisPermitidosSet.has(papelUsuario)) {
      return next(criarErroPermissaoInsuficiente())
    }

    return next()
  }
}