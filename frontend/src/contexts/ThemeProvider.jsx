import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

import { ThemeContext } from './theme-context.js'
import {
  decidirTemaInicial,
  gravarPreferencia,
  lerPreferenciaSalva,
} from '../utils/tema.js'

// lerPreferenciaSalva acessa globalThis.localStorage dentro do próprio try:
// em contexto com armazenamento bloqueado, até ler a propriedade lança, e o
// provider precisa montar mesmo assim.
function obterPreferenciaSalva() {
  return lerPreferenciaSalva()
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

    // A preferência continua válida durante a sessão se a gravação falhar.
    gravarPreferencia(tema)
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
