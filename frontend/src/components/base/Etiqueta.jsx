/*
 * Etiqueta de estado (Lote 3a). O texto sempre diz o estado; a cor só reforça.
 *
 * Para critério, `criterio` recebe o tom de utils/criterio-cores.js ('0'…'4' ou
 * 'neutro'): a cor aparece só em um ponto, e o nome fica em texto neutro, como
 * no protótipo da correção. Cor de critério em texto reprovaria no contraste.
 */

const TONS = {
  neutro: 'bg-superficie-rebaixada text-texto-suave',
  sucesso: 'bg-sucesso-fundo text-sucesso',
  atencao: 'bg-atencao-fundo text-atencao',
  erro: 'bg-erro-fundo text-erro',
  info: 'bg-info-fundo text-info',
  acao: 'bg-acao-suave text-acao-texto',
}

export default function Etiqueta({ tom = 'neutro', criterio, children, className = '' }) {
  const cores =
    criterio === undefined
      ? (TONS[tom] ?? TONS.neutro)
      : 'bg-superficie-rebaixada text-texto'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pilula px-2.5 py-0.5 text-xs font-semibold leading-[17px] ${cores} ${className}`}
    >
      {criterio !== undefined && (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ background: `var(--criterio-${criterio})` }}
        />
      )}
      {children}
    </span>
  )
}
