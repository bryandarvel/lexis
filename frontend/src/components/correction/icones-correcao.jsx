/*
 * Ícones da correção (Issue #179). Decorativos: o nome acessível vem sempre do
 * botão que os contém. Ficam aqui, e não em components/base/icones.jsx, porque
 * só o card de análise os usa.
 */

const PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

// Documento com lupa: analisar a redação.
export function IconeAnalisar() {
  return (
    <svg {...PROPS}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M14 3v4a2 2 0 0 0 2 2h3" />
      <path d="M8 8h3M8 12h3" />
      <circle cx="16" cy="16" r="3.2" />
      <path d="m18.4 18.4 2.1 2.1" />
    </svg>
  )
}

export function IconeRecarregar() {
  return (
    <svg {...PROPS}>
      <path d="M20 11a8 8 0 1 0-.9 4.6" />
      <path d="M20 5v6h-6" />
    </svg>
  )
}
