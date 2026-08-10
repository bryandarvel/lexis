import { AppError } from '../../utils/app-error.js'

import {
  listarNotificacoesAluno,
  marcarNotificacaoComoLida,
} from './notificacoes.repository.js'

function criarErroNotificacaoNaoEncontrada() {
  return new AppError(
    'A notificação não foi encontrada.',
    {
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND',
    },
  )
}

export function listarNotificacoesParaAluno(
  dados,
  {
    listar = listarNotificacoesAluno,
  } = {},
) {
  return listar(dados)
}

export async function marcarNotificacaoLidaParaAluno(
  {
    notificacaoId,
    alunoId,
  },
  {
    marcarComoLida = marcarNotificacaoComoLida,
    agora = () => new Date(),
  } = {},
) {
  const resultado = await marcarComoLida({
    notificacaoId,
    alunoId,
    lidaEm: agora(),
  })

  if (resultado.status === 'NOTIFICACAO_INDISPONIVEL') {
    throw criarErroNotificacaoNaoEncontrada()
  }

  return resultado.notificacao
}
