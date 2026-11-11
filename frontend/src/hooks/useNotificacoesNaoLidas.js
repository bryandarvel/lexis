import {
  useEffect,
  useState,
} from 'react'

import { listarNotificacoes } from '../services/notificacoes.js'
import {
  observarContagemNotificacoes,
} from '../services/notification-events.js'
import {
  estadoDaContaAtual,
  marcarConta,
} from '../utils/identidade-sessao.js'

const INICIAL = { totalNaoLidas: 0, usuarioId: null }

// A listagem é injetável para o sino do professor usar o endpoint dele; o
// padrão continua sendo o do aluno, então o comportamento atual não muda.
//
// A contagem pertence à conta que a carregou. Depois de uma reautenticação
// como outra pessoa, o sino não pode continuar mostrando os avisos da conta
// anterior: a contagem some do render na hora e uma nova consulta começa.
// Reautenticar na mesma conta não muda o id e preserva a contagem.
export function useNotificacoesNaoLidas({
  habilitado,
  listar = listarNotificacoes,
  usuarioId = null,
}) {
  const [estado, setEstado] = useState(INICIAL)

  useEffect(() => {
    if (!habilitado) return undefined

    let ativo = true
    const controlador = new AbortController()
    const pararObservacao =
      observarContagemNotificacoes((total) => {
        if (ativo && Number.isInteger(total)) {
          setEstado(
            marcarConta(
              { totalNaoLidas: Math.max(0, total) },
              usuarioId,
            ),
          )
        }
      })

    listar({ signal: controlador.signal })
      .then((resultado) => {
        // A consulta foi pedida por esta conta; se outra entrou enquanto ela
        // corria, a limpeza do efeito já passou e a resposta é descartada.
        if (ativo) {
          setEstado(
            marcarConta(
              { totalNaoLidas: resultado.totalNaoLidas },
              usuarioId,
            ),
          )
        }
      })
      .catch(() => {
        // A página de notificações oferece o tratamento de erro completo.
      })

    return () => {
      ativo = false
      controlador.abort()
      pararObservacao()
    }
  }, [habilitado, listar, usuarioId])

  return estadoDaContaAtual(estado, usuarioId, INICIAL).totalNaoLidas
}
