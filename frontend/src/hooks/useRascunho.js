import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  lerRascunho,
  removerRascunho,
  salvarRascunho,
} from '../utils/draft-storage.js'

const INTERVALO_AUTOSAVE = 15_000

function serializar(valor) {
  try {
    return JSON.stringify(valor)
  } catch {
    return null
  }
}

export function useRascunho({
  chave,
  habilitado,
  valorAtual,
}) {
  const [recuperado, setRecuperado] =
    useState(null)
  const [salvoEm, setSalvoEm] = useState(null)
  const ultimoSalvo = useRef(null)
  const valorAtualRef = useRef(valorAtual)

  valorAtualRef.current = valorAtual

  useEffect(() => {
    if (!habilitado || !chave) {
      setRecuperado(null)
      setSalvoEm(null)
      ultimoSalvo.current = null
      return
    }

    const rascunho = lerRascunho(chave)

    setRecuperado(rascunho)
    setSalvoEm(rascunho?.atualizadoEm ?? null)
    ultimoSalvo.current = serializar(
      valorAtualRef.current,
    )
  }, [chave, habilitado])

  const salvarAgora = useCallback(() => {
    if (!habilitado || !chave) {
      return false
    }

    const serializado = serializar(valorAtual)

    if (
      !serializado ||
      serializado === ultimoSalvo.current
    ) {
      return false
    }

    const salvo = salvarRascunho(
      chave,
      valorAtual,
    )

    if (!salvo) {
      return false
    }

    ultimoSalvo.current = serializado
    setSalvoEm(salvo.atualizadoEm)
    return true
  }, [chave, habilitado, valorAtual])

  useEffect(() => {
    if (!habilitado) {
      return undefined
    }

    const intervalId = globalThis.setInterval(
      salvarAgora,
      INTERVALO_AUTOSAVE,
    )

    return () => globalThis.clearInterval(intervalId)
  }, [habilitado, salvarAgora])

  useEffect(() => {
    if (!habilitado) {
      return undefined
    }

    function salvarAoOcultar() {
      if (document.visibilityState === 'hidden') {
        salvarAgora()
      }
    }

    document.addEventListener(
      'visibilitychange',
      salvarAoOcultar,
    )
    globalThis.addEventListener(
      'pagehide',
      salvarAgora,
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        salvarAoOcultar,
      )
      globalThis.removeEventListener(
        'pagehide',
        salvarAgora,
      )
    }
  }, [habilitado, salvarAgora])

  const descartar = useCallback((valorBase) => {
    removerRascunho(chave)
    setRecuperado(null)
    setSalvoEm(null)
    ultimoSalvo.current = serializar(
      valorBase ?? valorAtualRef.current,
    )
  }, [chave])

  const recuperar = useCallback(() => {
    const valor = recuperado?.valor ?? null
    setRecuperado(null)
    ultimoSalvo.current = null
    return valor
  }, [recuperado])

  return {
    recuperado,
    salvoEm,
    descartar,
    recuperar,
    salvarAgora,
  }
}
