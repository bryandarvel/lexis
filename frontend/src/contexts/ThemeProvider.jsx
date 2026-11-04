import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

import { ThemeContext } from './theme-context.js'
import {
  CHAVE_TEMA,
  decidirTemaInicial,
  lerPreferenciaSalva,
} from '../utils/tema.js'

function obterPreferenciaSalva() {
  return lerPreferenciaSalva(globalThis.localStorage)
}

export default function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() =>
    decidirTemaInicial(obterPreferenciaSalva()),
  )
  const [escolhido, setEscolhido] = useState(
    () => obterPreferenciaSalva() !== null,
  )

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = tema
    document.documentElement.style.colorScheme = tema
  }, [tema])

  // Só grava depois de uma escolha explícita: o tema padrão não vira uma
  // preferência salva que o usuário nunca pediu.
  useEffect(() => {
    if (!escolhido) return

    try {
      localStorage.setItem(CHAVE_TEMA, tema)
    } catch {
      // A preferência continua válida durante a sessão.
    }
  }, [tema, escolhido])

  const alternarTema = useCallback(() => {
    setTema((temaAtual) =>
      temaAtual === 'light' ? 'dark' : 'light',
    )
    setEscolhido(true)
  }, [])

  const valorContexto = useMemo(
    () => ({
      tema,
      temaEscuro: tema === 'dark',
      alternarTema,
    }),
    [tema, alternarTema],
  )

  return (
    <ThemeContext.Provider value={valorContexto}>
      {children}
    </ThemeContext.Provider>
  )
}
