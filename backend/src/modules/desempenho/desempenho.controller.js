import {
  obterDesempenhoParaAluno,
} from './desempenho.service.js'

export function criarObterDesempenhoController({
  obterDesempenho = obterDesempenhoParaAluno,
} = {}) {
  return async function obterDesempenhoController(
    req,
    res,
  ) {
    const desempenho = await obterDesempenho({
      alunoId: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: {
        desempenho,
      },
    })
  }
}
