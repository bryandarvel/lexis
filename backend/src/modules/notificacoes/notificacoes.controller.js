import {
  listarNotificacoesParaAluno,
  marcarNotificacaoLidaParaAluno,
} from './notificacoes.service.js'

export function criarListarNotificacoesController({
  listarNotificacoes = listarNotificacoesParaAluno,
} = {}) {
  return async function listarNotificacoesController(
    req,
    res,
  ) {
    const resultado = await listarNotificacoes({
      alunoId: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: resultado,
    })
  }
}

export function criarMarcarNotificacaoLidaController({
  marcarNotificacaoLida =
    marcarNotificacaoLidaParaAluno,
} = {}) {
  return async function marcarNotificacaoLidaController(
    req,
    res,
  ) {
    const notificacao = await marcarNotificacaoLida({
      notificacaoId: req.params.notificacaoId,
      alunoId: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: {
        notificacao,
      },
    })
  }
}
