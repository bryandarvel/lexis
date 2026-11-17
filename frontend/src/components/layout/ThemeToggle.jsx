import { useTheme } from '../../hooks/useTheme.js'
import { IconeLua, IconeSol } from './icones-casca.jsx'

/*
 * Alternador de tema (Lote 5, UX-026). O nome acessível é fixo, "Tema escuro",
 * e o estado vai em aria-pressed: um nome que muda a cada clique faz o leitor
 * de tela anunciar o contrário do que acabou de acontecer. A troca é
 * instantânea; o polegar não anima.
 */
export default function ThemeToggle({ compacto = false }) {
  const {
    temaEscuro,
    alternarTema,
  } = useTheme()

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label="Tema escuro"
      aria-pressed={temaEscuro}
      title="Tema escuro"
      className="theme-toggle"
    >
      <span aria-hidden="true" className="theme-toggle__trilho">
        <IconeSol />
        <IconeLua />
        <span className="theme-toggle__polegar">
          {temaEscuro ? <IconeLua /> : <IconeSol />}
        </span>
      </span>
      {!compacto && <span>Tema escuro</span>}
    </button>
  )
}
