import {
  useEffect,
  useState,
} from 'react'

import { listarNotificacoes } from '../services/notificacoes.js'
import {
  observarContagemNotificacoes,
} from '../services/notification-events.js'

export function useNotificacoesNaoLidas({
  habilitado,
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

    listarNotificacoes({ signal: controlador.signal })
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
  }, [habilitado])

  return totalNaoLidas
}
