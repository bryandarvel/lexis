/*
 * Botão base (Lote 3a). Quatro variantes, dois tamanhos, estado de carregamento.
 *
 * Regra do anel de foco: nunca usar o utilitário `transition` sem sufixo aqui.
 * Ele inclui outline-color e faz o anel nascer branco no primeiro quadro
 * (UX-023). A transição é restrita a cor de fundo, filtro e opacidade.
 */

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-controle border font-semibold leading-[18px] ' +
  'transition-[background-color,border-color,filter,opacity] duration-[var(--rapido)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60'

const VARIANTES = {
  primario:
    'border-transparent bg-acao text-texto-sobre-acao hover:bg-acao-hover',
  secundario:
    'border-borda-campo bg-transparent text-texto hover:bg-superficie-rebaixada',
  perigo:
    'border-perigo bg-transparent text-perigo hover:bg-erro-fundo',
  fantasma:
    'border-transparent bg-transparent text-acao-texto hover:bg-acao-suave',
}

const TAMANHOS = {
  padrao: 'min-h-11 px-5 text-[13px]',
  compacto: 'min-h-9 px-3 text-[13px]',
}

export default function Botao({
  as: Elemento = 'button',
  variante = 'primario',
  tamanho = 'padrao',
  carregando = false,
  rotuloCarregando,
  className = '',
  children,
  type,
  disabled,
  ...resto
}) {
  const ehBotaoNativo = Elemento === 'button'
  const desabilitado = Boolean(disabled) || carregando
  const classes = [
    BASE,
    VARIANTES[variante] ?? VARIANTES.primario,
    TAMANHOS[tamanho] ?? TAMANHOS.padrao,
    className,
  ].join(' ')

  const propsDeEstado = ehBotaoNativo
    ? { type: type ?? 'button', disabled: desabilitado }
    : { 'aria-disabled': desabilitado || undefined }

  return (
    <Elemento
      {...resto}
      {...propsDeEstado}
      aria-busy={carregando || undefined}
      className={classes}
    >
      {carregando && (
        <span
          aria-hidden="true"
          className="size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
        />
      )}
      {carregando && rotuloCarregando ? rotuloCarregando : children}
    </Elemento>
  )
}
