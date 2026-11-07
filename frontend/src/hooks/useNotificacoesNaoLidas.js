import {
  useEffect,
  useState,
} from 'react'

import { listarNotificacoes } from '../services/notificacoes.js'
import {
  observarContagemNotificacoes,
} from '../services/notification-events.js'

// A listagem é injetável para o sino do professor usar o endpoint dele; o
// padrão continua sendo o do aluno, então o comportamento atual não muda.
export function useNotificacoesNaoLidas({
  habilitado,
  listar = listarNotificacoes,
}) {
  const [totalNaoLidas, setTotalNaoLidas] =
    useState(0)

  useEffect(() => {
    if (!habilitado) return undefined

    let ativo = true
    const controlador = new AbortController()
    const pararObservacao =
      observarContagemNotificacoes((total) => {
        if (ativo && Number.isInteger(total)) {
          setTotalNaoLidas(Math.max(0, total))
        }
      })

    listar({ signal: controlador.signal })
      .then((resultado) => {
        if (ativo) {
          setTotalNaoLidas(resultado.totalNaoLidas)
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
  }, [habilitado, listar])

  return totalNaoLidas
}
