import {
  enviarRedacaoParaAluno,
  listarRedacoesParaAluno,
  listarRedacoesParaProfessor,
  obterRedacaoParaAluno,
  obterRedacaoParaProfessor,
  salvarRascunhoParaAluno,
  transcreverImagemParaAluno,
} from './redacoes.service.js'

export async function salvarRascunhoController(
  req,
  res,
) {
  const redacao = await salvarRascunhoParaAluno({
    temaId: req.params.temaId,
    alunoId: req.auth.usuarioId,
    texto: req.body.texto,
  })

  return res.status(200).json({
    data: {
      redacao,
    },
  })
}

export async function transcreverImagemController(
  req,
  res,
) {
  const arquivo = req.file

  try {
    const redacao =
      await transcreverImagemParaAluno({
        temaId: req.params.temaId,
        alunoId: req.auth.usuarioId,
        arquivo,
      })

    return res.status(200).json({
      data: {
        redacao,
        revisaoObrigatoria:
          redacao.origemTexto === 'OCR' &&
          !redacao.ocrRevisadoEm,
      },
    })
  } finally {
    arquivo.buffer = undefined
  }
}

export async function enviarRedacaoController(
  req,
  res,
) {
  const redacao = await enviarRedacaoParaAluno({
    temaId: req.params.temaId,
    alunoId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      redacao,
    },
  })
}

export async function listarRedacoesAlunoController(
  req,
  res,
) {
  const redacoes = await listarRedacoesParaAluno(
    req.auth.usuarioId,
  )

  return res.status(200).json({
    data: {
      redacoes,
    },
  })
}

export async function obterRedacaoAlunoController(
  req,
  res,
) {
  const redacao = await obterRedacaoParaAluno({
    redacaoId: req.params.redacaoId,
    alunoId: req.auth.usuarioId,
  })

  return res.status(200).json({
    data: {
      redacao,
    },
  })
}

export async function listarRedacoesProfessorController(
  req,
  res,
) {
  const redacoes =
    await listarRedacoesParaProfessor({
      turmaId: req.params.turmaId,
      professorId: req.auth.usuarioId,
      temaId: req.queryValidada.temaId,
      status: req.queryValidada.status,
    })

  return res.status(200).json({
    data: {
      redacoes,
    },
  })
}

export async function obterRedacaoProfessorController(
  req,
  res,
) {
  const redacao =
    await obterRedacaoParaProfessor({
      redacaoId: req.params.redacaoId,
      professorId: req.auth.usuarioId,
    })

  return res.status(200).json({
    data: {
      redacao,
    },
  })
}