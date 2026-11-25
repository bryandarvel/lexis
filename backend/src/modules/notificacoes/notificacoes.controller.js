import {
  listarNotificacoesParaAluno,
  marcarNotificacaoLidaParaAluno,
} from './notificacoes.service.js'

export function criarListarNotificacoesController({
  listarNotificacoes = listarNotificacoesParaAluno,
  campoUsuario = 'alunoId',
} = {}) {
  return async function listarNotificacoesController(
    req,
    res,
  ) {
    const resultado = await listarNotificacoes({
      [campoUsuario]: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: resultado,
    })
  }
}

export function criarMarcarNotificacaoLidaController({
  marcarNotificacaoLida =
    marcarNotificacaoLidaParaAluno,
  campoUsuario = 'alunoId',
} = {}) {
  return async function marcarNotificacaoLidaController(
    req,
    res,
  ) {
    const notificacao = await marcarNotificacaoLida({
      notificacaoId: req.params.notificacaoId,
      [campoUsuario]: req.auth.usuarioId,
    })

    return res.status(200).json({
      data: {
        notificacao,
      },
    })
  }
}
