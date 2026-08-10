import { AppError } from '../utils/app-error.js'

function criarDetalhesValidacao(issues) {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }))
}

function criarValidador(parteRequisicao) {
  return function validar(schema) {
    return function validationMiddleware(
      req,
      _res,
      next,
    ) {
      const resultado = schema.safeParse(
        req[parteRequisicao],
      )

      if (!resultado.success) {
        return next(
          new AppError(
            'Dados de entrada inválidos.',
            {
              statusCode: 422,
              code: 'VALIDATION_ERROR',
              details: criarDetalhesValidacao(
                resultado.error.issues,
              ),
            },
          ),
        )
      }

      if (parteRequisicao === 'query') {
        req.queryValidada = resultado.data
      } else {
        req[parteRequisicao] = resultado.data
      }

      return next()
    }
  }
}

export const validarBody = criarValidador('body')
export const validarParams = criarValidador('params')
export const validarQuery = criarValidador('query')