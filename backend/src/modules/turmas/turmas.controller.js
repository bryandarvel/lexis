import {
  arquivarTurmaParaProfessor,
  criarTurmaParaProfessor,
  desvincularAlunoComoProfessor,
  entrarEmTurmaComoAluno,
  listarAlunosAtivosParaProfessor,
  listarTurmasParaProfessor,
  obterMatriculaAtivaParaAluno,
  obterTurmaParaProfessor,
  regenerarCodigoParaProfessor,
  renomearTurmaParaProfessor,
  sairDaTurmaComoAluno,
} from './turmas.service.js'

export async function criarTurmaController(req, res) {
  const turma = await criarTurmaParaProfessor({
    nome: req.body.nome,
    professorId: req.auth.usuarioId,
  })

  return res.status(201).json({
    data: {
      turma,
    },
  })
}

export async function listarTurmasController(req, res) {
  const turmas = await listarTurmasParaProfessor(
    req.auth.usuarioId,
  )

  return res.status(200).json({
    data: {
      turmas,
    },
  })
}

export async function obterTurmaController(req, res) {
  const turma = await obterTurmaParaProfessor({
    turmaId: req.params.turmaId,
    professorId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      turma,
    },
  })
}

export async function renomearTurmaController(req, res) {
  const turma = await renomearTurmaParaProfessor({
    turmaId: req.params.turmaId,
    professorId: req.auth.usuarioId,
    nome: req.body.nome,
  })

  return res.status(200).json({
    data: {
      turma,
    },
  })
}

export async function regenerarCodigoController(
  req,
  res,
) {
  const turma = await regenerarCodigoParaProfessor({
    turmaId: req.params.turmaId,
    professorId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      turma,
    },
  })
}

export async function arquivarTurmaController(
  req,
  res,
) {
  const turma = await arquivarTurmaParaProfessor({
    turmaId: req.params.turmaId,
    professorId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      turma,
    },
  })
}

export async function entrarEmTurmaController(
  req,
  res,
) {
  const matricula = await entrarEmTurmaComoAluno({
    alunoId: req.auth.usuarioId,
    codigoAcesso: req.body.codigoAcesso,
  })

  return res.status(201).json({
    data: {
      matricula,
    },
  })
}

export async function obterMinhaMatriculaController(
  req,
  res,
) {
  const matricula =
    await obterMatriculaAtivaParaAluno(
      req.auth.usuarioId,
    )

  return res.status(200).json({
    data: {
      matricula,
    },
  })
}

export async function sairDaTurmaController(req, res) {
  const matricula = await sairDaTurmaComoAluno(
    req.auth.usuarioId,
  )

  return res.status(200).json({
    data: {
      matricula,
    },
  })
}

export async function listarAlunosDaTurmaController(
  req,
  res,
) {
  const matriculas =
    await listarAlunosAtivosParaProfessor({
      turmaId: req.params.turmaId,
      professorId: req.auth.usuarioId,
    })

  return res.status(200).json({
    data: {
      matriculas,
    },
  })
}

export async function desvincularAlunoController(
  req,
  res,
) {
  const matricula =
    await desvincularAlunoComoProfessor({
      turmaId: req.params.turmaId,
      alunoId: req.params.alunoId,
      professorId: req.auth.usuarioId,
    })

  return res.status(200).json({
    data: {
      matricula,
    },
  })
}