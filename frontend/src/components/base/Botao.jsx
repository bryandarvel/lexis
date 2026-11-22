import { resolverPropsBotao } from '../../utils/botao-props.js'

/*
 * Botão base (Lote 3a). Cinco variantes, dois tamanhos, duas formas, estado de
 * carregamento.
 *
 * Regra do anel de foco: nunca usar o utilitário `transition` sem sufixo aqui.
 * Ele inclui outline-color e faz o anel nascer branco no primeiro quadro
 * (UX-023). A transição é restrita a cor de fundo, filtro e opacidade.
 *
 * Padrão de tamanho (Issue #186): o botão padrão tem 44 px de altura, piso de
 * 7 rem (112 px) de largura e 24 px de respiro lateral, para um rótulo curto
 * como "Salvar" ou "Copiar" não virar uma tampinha. O arredondamento é o do
 * cartão. A forma "pilula" é só dos botões de IA, que se distinguem dos demais.
 *
 * O raio fica em FORMAS e a largura da borda em cada variante, e não em BASE:
 * duas classes da mesma propriedade no mesmo elemento se resolvem pela ordem do
 * CSS gerado, não pela ordem no atributo, e o resultado deixaria de ser
 * previsível. O contorno tem 2 px, como na referência dos botões de IA.
 */

const BASE =
  'botao-base inline-flex items-center justify-center gap-2 ' +
  'transition-[background-color,border-color,filter,opacity] duration-[var(--rapido)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60'

const VARIANTES = {
  primario:
    'border border-transparent bg-acao text-texto-sobre-acao hover:bg-acao-hover',
  secundario:
    'border border-borda-campo bg-transparent text-texto hover:bg-superficie-rebaixada',
  perigo:
    'border border-perigo bg-transparent text-perigo hover:bg-erro-fundo',
  fantasma:
    'border border-transparent bg-transparent text-acao-texto hover:bg-acao-suave',
  // Contorno na cor de ação: o par "secundário" do botão primário, usado onde
  // a ação é a mesma família do preenchido (a reanálise da IA).
  contorno:
    'border-2 border-acao bg-transparent text-acao-texto hover:bg-acao-suave',
}

const TAMANHOS = {
  padrao: 'min-h-11 min-w-28 px-6',
  compacto: 'min-h-9 px-3',
}

const FORMAS = {
  padrao: 'rounded-cartao',
  pilula: 'rounded-pilula',
}

export default function Botao({
  as: Elemento = 'button',
  variante = 'primario',
  tamanho = 'padrao',
  forma = 'padrao',
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
    FORMAS[forma] ?? FORMAS.padrao,
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
