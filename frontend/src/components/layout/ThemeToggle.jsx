import { useTheme } from '../../hooks/useTheme.js'

export default function ThemeToggle({ compacto = false }) {
  const {
    temaEscuro,
    alternarTema,
  } = useTheme()

  const proximoTema = temaEscuro
    ? 'claro'
    : 'escuro'

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={`Ativar tema ${proximoTema}`}
      aria-pressed={temaEscuro}
      title={`Ativar tema ${proximoTema}`}
      className="theme-toggle"
    >
      <span aria-hidden="true">
        {temaEscuro ? '☾' : '☀'}
      </span>
      {!compacto && (
        <span>
          {temaEscuro ? 'Escuro' : 'Claro'}
        </span>
      )}
    </button>
  )
}
