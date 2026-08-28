import { useContext } from 'react'

import { ThemeContext } from '../contexts/theme-context.js'

export function useTheme() {
  const contexto = useContext(ThemeContext)

  if (!contexto) {
    throw new Error(
      'useTheme deve ser usado dentro de ThemeProvider.',
    )
  }

  return contexto
}
