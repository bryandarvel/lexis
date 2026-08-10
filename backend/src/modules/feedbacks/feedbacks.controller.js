import {
  consultarFeedbackParaProfessor,
  consultarFeedbackPublicadoParaAluno,
  publicarFeedbackParaProfessor,
  salvarFeedbackRascunhoParaProfessor,
} from './feedbacks.service.js'

export function criarConsultarFeedbackController({
  consultarFeedback =
    consultarFeedbackParaProfessor,
} = {}) {
  return async function consultarFeedbackController(
    req,
    res,
  ) {
    const feedback = await consultarFeedback({
      redacaoId: req.params.redacaoId,
      professorId: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: {
        feedback,
      },
    })
  }
}

export const consultarFeedbackController =
  criarConsultarFeedbackController()

export function criarConsultarFeedbackAlunoController({
  consultarFeedback =
    consultarFeedbackPublicadoParaAluno,
} = {}) {
  return async function consultarFeedbackAlunoController(
    req,
    res,
  ) {
    const feedback = await consultarFeedback({
      redacaoId: req.params.redacaoId,
      alunoId: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: {
        feedback,
      },
    })
  }
}

export const consultarFeedbackAlunoController =
  criarConsultarFeedbackAlunoController()

export function criarPublicarFeedbackController({
  publicarFeedback =
    publicarFeedbackParaProfessor,
} = {}) {
  return async function publicarFeedbackController(
    req,
    res,
  ) {
    const resultado = await publicarFeedback({
      redacaoId: req.params.redacaoId,
      professorId: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: resultado,
    })
  }
}

export const publicarFeedbackController =
  criarPublicarFeedbackController()

export function criarSalvarFeedbackRascunhoController({
  salvarFeedback =
    salvarFeedbackRascunhoParaProfessor,
} = {}) {
  return async function salvarFeedbackRascunhoController(
    req,
    res,
  ) {
    const feedback = await salvarFeedback({
      redacaoId: req.params.redacaoId,
      professorId: req.auth.usuarioId,
      nota: req.body.nota,
      comentarioGeral: req.body.comentarioGeral,
      criterios: req.body.criterios,
    })

    return res.status(200).json({
      data: {
        feedback,
      },
    })
  }
}

export const salvarFeedbackRascunhoController =
  criarSalvarFeedbackRascunhoController()
