/*
 * Ícones de traço da casca (AppShell). Um só conjunto para os dois papéis
 * (UX-008, UX-009). Decorativos: o nome acessível vem do controle em volta.
 */

const PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  // Traço leve (Issue #188): 2 pesava dentro da moldura do item de navegação.
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

function IconeInicio() {
  return (
    <svg {...PROPS}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}

function IconeEscrever() {
  return (
    <svg {...PROPS}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconeRedacoes() {
  return (
    <svg {...PROPS}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  )
}

function IconePerfil() {
  return (
    <svg {...PROPS}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

function IconePainel() {
  return (
    <svg {...PROPS}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

function IconeTurmas() {
  return (
    <svg {...PROPS}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14.4A6.5 6.5 0 0 1 21.5 20" />
    </svg>
  )
}

export function IconeSino() {
  return (
    <svg {...PROPS} strokeWidth={1.8}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}

export function IconeMenu() {
  return (
    <svg {...PROPS}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

// Chaves dos itens de utils/navegacao-casca.js.
const ICONES_DA_NAVEGACAO = {
  inicio: IconeInicio,
  escrever: IconeEscrever,
  redacoes: IconeRedacoes,
  perfil: IconePerfil,
  painel: IconePainel,
  turmas: IconeTurmas,
}

export function IconeSol() {
  return (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function IconeLua() {
  return (
    <svg {...PROPS}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export function IconeDaNavegacao({ chave }) {
  const Icone = ICONES_DA_NAVEGACAO[chave]

  return Icone ? <Icone /> : null
}
