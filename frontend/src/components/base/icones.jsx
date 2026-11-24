/*
 * Ícones de traço usados pelos componentes base. Decorativos: o nome
 * acessível sempre vem do controle que os contém.
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

// Sinais editoriais: o texto ao lado continua sendo o nome acessível.
const TRACOS = {
  redacao: 'M14 3H5v18h14V8ZM14 3v5h5M8 12h8M8 16h6',
  escrever: 'm4 16 12-12a2 2 0 0 1 4 4L8 20l-5 1Z',
  comentario: 'M4 4h16v12H9l-5 4Z M8 8h8M8 12h5',
  revisar: 'M15 4H5v16h8M8 8h5M8 12h3m3 4 2 2 5-6',
  notas: 'M4 20h16M6 16v-4m6 4V8m6 8V4',
  calendario: 'M4 5h16v15H4ZM8 3v4m8-4v4M4 10h16',
  foto: 'M3 7h4l2-3h6l2 3h4v13H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  tempo: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
}

export function IconeEditorial({ tipo }) {
  return <svg {...PROPS} width="1em" height="1em" className="me-1.5 inline-block align-[-0.12em]"><path d={TRACOS[tipo]} /></svg>
}

export function IconeOlho() {
  return (
    <svg {...PROPS}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function IconeOlhoRiscado() {
  return (
    <svg {...PROPS}>
      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1" />
      <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  )
}

export function IconeErro() {
  return (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
    </svg>
  )
}

export function IconeSucesso() {
  return (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 9.8" />
    </svg>
  )
}

export function IconeAtencao() {
  return (
    <svg {...PROPS}>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function IconeInfo() {
  return (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  )
}

export function IconeEngrenagem() {
  return (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export function IconeBaixar() {
  return (
    <svg {...PROPS}>
      <path d="M12 4v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  )
}
