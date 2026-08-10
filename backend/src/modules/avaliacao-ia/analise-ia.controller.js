import {
  listarAnalisesIaParaProfessor,
  solicitarAnaliseIaParaProfessor,
} from './analise-ia.service.js'

export function criarSolicitarAnaliseIaController({
  solicitarAnalise =
    solicitarAnaliseIaParaProfessor,
} = {}) {
  return async function solicitarAnaliseIaController(
    req,
    res,
  ) {
    const analise = await solicitarAnalise({
      redacaoId: req.params.redacaoId,
      professorId: req.auth.usuarioId,
    })

    return res.status(201).json({
      data: {
        analise,
      },
    })
  }
}

export const solicitarAnaliseIaController =
  criarSolicitarAnaliseIaController()

export function criarListarAnalisesIaController({
  listarAnalises =
    listarAnalisesIaParaProfessor,
} = {}) {
  return async function listarAnalisesIaController(
    req,
    res,
  ) {
    const analises = await listarAnalises({
      redacaoId: req.params.redacaoId,
      professorId: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: {
        analises,
      },
    })
  }
}

export const listarAnalisesIaController =
  criarListarAnalisesIaController()
