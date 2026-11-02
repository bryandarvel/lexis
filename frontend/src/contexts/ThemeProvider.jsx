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
  lerPreferenciaDoSistema,
  lerPreferenciaSalva,
} from '../utils/tema.js'

const CONSULTA_ESCURO = '(prefers-color-scheme: dark)'

function consultarMidia(consulta) {
  return globalThis.matchMedia?.(consulta)
}

function obterPreferenciaSalva() {
  return lerPreferenciaSalva(globalThis.localStorage)
}

function obterTemaInicial() {
  return decidirTemaInicial(
    obterPreferenciaSalva(),
    lerPreferenciaDoSistema(consultarMidia),
  )
}

export default function ThemeProvider({ children }) {
  const [tema, setTema] = useState(obterTemaInicial)
  const [escolhido, setEscolhido] = useState(
    () => obterPreferenciaSalva() !== null,
  )

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = tema
    document.documentElement.style.colorScheme = tema
  }, [tema])

  // Só grava depois de uma escolha explícita: assim o tema do sistema não é
  // sobrescrito por um valor que o usuário nunca pediu.
  useEffect(() => {
    if (!escolhido) return

    try {
      localStorage.setItem(CHAVE_TEMA, tema)
    } catch {
      // A preferência continua válida durante a sessão.
    }
  }, [tema, escolhido])

  // Enquanto não houver escolha, acompanha o sistema também durante a sessão.
  useEffect(() => {
    if (escolhido) return undefined

    const consulta = consultarMidia(CONSULTA_ESCURO)

    if (!consulta?.addEventListener) return undefined

    const aoMudar = (evento) =>
      setTema(evento.matches ? 'dark' : 'light')

    consulta.addEventListener('change', aoMudar)

    return () =>
      consulta.removeEventListener('change', aoMudar)
  }, [escolhido])

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
