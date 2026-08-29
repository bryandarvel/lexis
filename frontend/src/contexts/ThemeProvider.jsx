import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

import { ThemeContext } from './theme-context.js'

const THEME_STORAGE_KEY = 'lexis:preferencia:tema'

function obterTemaInicial() {
  try {
    const temaSalvo = localStorage.getItem(
      THEME_STORAGE_KEY,
    )

    return temaSalvo === 'dark'
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

export default function ThemeProvider({ children }) {
  const [tema, setTema] = useState(obterTemaInicial)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = tema
    document.documentElement.style.colorScheme = tema

    try {
      localStorage.setItem(THEME_STORAGE_KEY, tema)
    } catch {
      // A preferência continua válida durante a sessão.
    }
  }, [tema])

  const alternarTema = useCallback(() => {
    setTema((temaAtual) =>
      temaAtual === 'light' ? 'dark' : 'light',
    )
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
