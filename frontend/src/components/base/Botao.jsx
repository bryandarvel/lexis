import { resolverPropsBotao } from '../../utils/botao-props.js'

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
  onClick,
  ...resto
}) {
  const propsDeEstado = resolverPropsBotao({
    nativo: Elemento === 'button',
    desabilitado: disabled,
    carregando,
    type,
    onClick,
    resto,
  })
  const classes = [
    BASE,
    VARIANTES[variante] ?? VARIANTES.primario,
    TAMANHOS[tamanho] ?? TAMANHOS.padrao,
    className,
  ].join(' ')

  // Link bloqueado não pode chegar a renderizar: o Link do React Router gera um
  // href para a própria rota mesmo sem `to`, e o menu de contexto ("abrir em
  // nova guia") ainda funcionaria. Nesse caso o elemento vira um <span>.
  const bloqueadoNaoNativo = Elemento !== 'button' && (Boolean(disabled) || carregando)
  const ElementoFinal = bloqueadoNaoNativo ? 'span' : Elemento

  return (
    <ElementoFinal
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
    </ElementoFinal>
  )
}
