import {
  arquivarTemaParaProfessor,
  atualizarTemaParaProfessor,
  criarTemaParaProfessor,
  listarTemasParaAluno,
  listarTemasParaProfessor,
  obterTemaParaAluno,
  obterTemaParaProfessor,
  substituirCriteriosParaProfessor,
} from './temas.service.js'
import {
  obterModeloCompetenciaDois,
} from './temas.competencia-dois.js'

export function obterModeloCompetenciaDoisController(
  _req,
  res,
) {
  return res.status(200).json({
    data: {
      modelo: obterModeloCompetenciaDois(),
    },
  })
}

export async function criarTemaController(req, res) {
  const tema = await criarTemaParaProfessor({
    turmaId: req.params.turmaId,
    professorId: req.auth.usuarioId,
    enunciado: req.body.enunciado,
    descricao: req.body.descricao,
    instrucoes: req.body.instrucoes,
    prazoEntrega: req.body.prazoEntrega,
    criterios: req.body.criterios,
  })

  return res.status(201).json({
    data: {
      tema,
    },
  })
}

export async function listarTemasController(req, res) {
  const temas = await listarTemasParaProfessor({
    turmaId: req.params.turmaId,
    professorId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      temas,
    },
  })
}

export async function obterTemaController(req, res) {
  const tema = await obterTemaParaProfessor({
    temaId: req.params.temaId,
    professorId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      tema,
    },
  })
}

export async function atualizarTemaController(
  req,
  res,
) {
  const tema = await atualizarTemaParaProfessor({
    temaId: req.params.temaId,
    professorId: req.auth.usuarioId,
    dados: req.body,
  })

  return res.status(200).json({
    data: {
      tema,
    },
  })
}

export async function substituirCriteriosController(
  req,
  res,
) {
  const tema =
    await substituirCriteriosParaProfessor({
      temaId: req.params.temaId,
      professorId: req.auth.usuarioId,
      criterios: req.body.criterios,
    })

  return res.status(200).json({
    data: {
      tema,
    },
  })
}

export async function arquivarTemaController(
  req,
  res,
) {
  const tema = await arquivarTemaParaProfessor({
    temaId: req.params.temaId,
    professorId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      tema,
    },
  })
}

export async function listarTemasAlunoController(
  req,
  res,
) {
  const temas = await listarTemasParaAluno(
    req.auth.usuarioId,
  )

  return res.status(200).json({
    data: {
      temas,
    },
  })
}

export async function obterTemaAlunoController(
  req,
  res,
) {
  const tema = await obterTemaParaAluno({
    temaId: req.params.temaId,
    alunoId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      tema,
    },
  })
}
