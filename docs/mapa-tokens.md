# Mapa de tokens do frontend

Liga cada token por função (`frontend/src/styles/tokens.css`) ao token antigo que ele substitui e ao bloco do protótipo da correção de onde veio o valor. Serve para não perder o vínculo com o material aprovado (REV-007) e para orientar a migração dos usos no Lote 3b.

## Situação

- **Lote 3a (este):** os tokens e os componentes base existem; nada do antigo foi removido. As telas atuais continuam usando `lexis-50…950` e as variáveis `--panel-*`, `--login-*` e `--aluno-*`.
- **Lote 3b:** migra os usos, apaga o antigo e o código morto.
- **D1 confirmada pelo Bryan no Figma.** Famílias Newsreader e Inter, navy `#002049` e azul `#1c6eba`, como no código e no protótipo.
- **Fonte dos valores:** `output/prototipo-correcao/index.html`, bloco "Tokens por função" (e `NOTA-PARA-CODEX.md`, tabela "Bloco → componente → token"). Essa pasta é ignorada pelo Git: a coluna "Protótipo" cita o nome da variável no arquivo, não um link. Onde o protótipo não define o token, a coluna diz "sem equivalente".

## Como ler

- **Claro / Escuro:** valor do token novo em cada tema.
- **Antigo:** o que o token substitui hoje. `lexis-N` é a escala numérica de `index.css`, **invertida no tema claro** (UX-019): `lexis-50` é o texto escuro e `lexis-900` é o branco.
- **Δ:** diferença visual esperada na migração. "igual" quer dizer o mesmo valor; "tom" é uma mudança pequena de matiz ou luminosidade, a conferir nas capturas do 3b.

## Superfícies

| Token | Claro | Escuro | Antigo | Protótipo | Δ |
|---|---|---|---|---|---|
| `--superficie-pagina` | `#f4f7fb` | `#06101f` | `--page-background`, `lexis-950`, `--panel-bg`, `--login-bg` | `--superficie-pagina` | igual no escuro; claro `#f6f8fb` → `#f4f7fb` nas telas com `--panel-bg` |
| `--superficie-conteudo` | `#ffffff` | `#111d2e` | `lexis-900`, `.surface-card`, `--panel-surface`, `--login-surface` | `--superficie-conteudo` | igual; painel e login no escuro `#1a2028` → `#111d2e` |
| `--superficie-rebaixada` | `#e9eff6` | `#0d1a2b` | `lexis-800`, `--aluno-neutro-fundo`, `--login-soft` | `--superficie-rebaixada` | tom; no escuro `lexis-800` era `#062b58` (azul) |
| `--superficie-campo` | `#ffffff` | `#0f1b2c` | `bg-lexis-950/55` (campos de entrada) | `--superficie-campo` | tom; deixa de ser translúcido |
| `--superficie-flutuante` | `#ffffff` | `#18273b` | `bg-lexis-900` e `--panel-surface` nos diálogos | `--superficie-flutuante` | tom no escuro |
| `--superficie-shell` | `#002049` | `#002049` | `--surface-shell-1` | `--superficie-shell` | igual |

## Texto

| Token | Claro | Escuro | Antigo | Protótipo | Δ |
|---|---|---|---|---|---|
| `--texto` | `#0b1f33` | `#f2f7fc` | `lexis-50` (`#071b2f` / `#f7fbff`), `--panel-text`, `--login-text` | `--texto` | tom |
| `--texto-suave` | `#34495f` | `#b4c6d8` | `lexis-200` (`#355068` / `#a9bed1`), `lexis-100` | `--texto-suave` | tom; funde `lexis-100` e `lexis-200` |
| `--texto-fraco` | `#516075` | `#93a8bd` | `--panel-muted`, `--login-muted` | `--texto-fraco` | igual no claro; escuro `#a9bed1` → `#93a8bd` |
| `--texto-sobre-acao` | `#ffffff` | `#ffffff` | `--text-on-action-blue` (claro `#fff`, escuro `lexis-950`) | `--texto-sobre-acao` | no escuro o botão passa a ter texto branco sobre `#1c6eba` |
| `--texto-sobre-shell` | `#f7fbff` | `#f7fbff` | `.surface-shell`, `--aluno-shell-texto` | `--texto-sobre-shell` | tom |

## Ação, foco e perigo

| Token | Claro | Escuro | Antigo | Protótipo | Δ |
|---|---|---|---|---|---|
| `--acao` | `#1c6eba` | `#1c6eba` | `--color-brand-accent`, `--login-action`, `lexis-400` (`#1674bd` / `#39a7f2`) | `--acao` | no escuro o botão deixa de ser azul-claro `#39a7f2` |
| `--acao-hover` | `#175f9f` | `#2478c8` | `lexis-500` no hover | `--acao-hover` | tom |
| `--acao-texto` | `#175795` | `#93c4f7` | `--panel-action`, `--aluno-acao-suave-texto`, `text-lexis-300` | `--acao-texto` | tom |
| `--acao-suave` | `#e3effa` | `#10294a` | `--panel-soft`, `--aluno-acao-suave`, `--login-selected` | `--acao-suave` | tom |
| `--perigo` / `--perigo-hover` | `#b42318` / `#8f1c12` | `#fca5a5` / `#fecaca` | `--aluno-erro`, `--panel-error`, vermelhos soltos | `--perigo`; o `-hover` não existe (sem equivalente) | tom |
| `--foco` | `#1674bd` | `#7dccff` | `--focus-color` | `--foco` | igual |
| `--foco-contraste` | `#ffffff` | `#06101f` | sem equivalente | `--foco-contraste` | novo |
| `--foco-sobre-shell` | `#7dccff` | `#7dccff` | foco próprio do shell | `--foco-sobre-shell` | igual |

## Bordas

| Token | Claro | Escuro | Antigo | Protótipo | Δ |
|---|---|---|---|---|---|
| `--borda` | `#d3dde8` | `#24344a` | `--surface-border` (`#c8d4e0` / `#2a3a4f`), `--panel-border`, `--login-border` | `--borda` | tom |
| `--borda-forte` | `#b3c1d1` | `#3a4c63` | `lexis-700` em bordas, `--aluno-trilho` | `--borda-forte` | tom |
| `--borda-campo` | `#7f91a4` | `#62788f` | `--aluno-borda-campo`, `--login-input-border`, `lexis-600` | `--borda-campo` | tom; contraste de borda de campo ≥ 3:1 |

## Estados

| Token | Claro | Escuro | Antigo | Protótipo | Δ |
|---|---|---|---|---|---|
| `--sucesso` / `-fundo` | `#166534` / `#e8f5ec` | `#7ddba3` / `#0f2a1c` | `--aluno-sucesso`, `--panel-success`, `.auth-notice-sucesso` | `--sucesso`, `--sucesso-fundo` | tom |
| `--atencao` / `-fundo` | `#8a4b08` / `#fdf3e1` | `#f0bb64` / `#33270d` | `--aluno-atencao`, `--panel-attention` | `--atencao`, `--atencao-fundo` | tom |
| `--erro` / `-fundo` | `#b42318` / `#fdecea` | `#fca5a5` / `#3d1717` | `--aluno-erro`, `.auth-notice-erro` | `--erro`, `--erro-fundo` | tom |
| `--info` / `-fundo` | `#175795` / `#e3effa` | `#93c4f7` / `#10294a` | `--panel-action` e `--panel-soft` | sem equivalente (reaproveita `--acao-texto` e `--acao-suave`) | novo, para o `Aviso` informativo |

## Cor de critério

A cor vem da **ordem** do critério (`utils/criterio-cores.js`, regra da Issue #44), nunca da posição na lista nem do nome. Ordem 1 usa `--criterio-0`, ordem 2 usa `--criterio-1`, e assim por diante; sem ordem válida, `--criterio-neutro`. Os valores são os atuais da #44, sem mudança.

Cor de critério aparece só em sublinhado, ponto e selo. O nome do critério fica sempre em texto neutro: `#a16207` sobre `#faedc4` dá cerca de 4,2:1, abaixo do mínimo para texto pequeno.

| Token | Claro (cor / fundo) | Escuro (cor / fundo) | Antigo | Protótipo |
|---|---|---|---|---|
| `--criterio-0` | `#7c3aed` / `#ede4fb` | `#c4a1fa` / `#362748` | `--review-color-0` e `--review-highlight` (`.review-tone-0`), `--feedback-tom` (`.feedback-tom-0`) | `--criterio-legitimacao` |
| `--criterio-1` | `#0f766e` / `#d0efeb` | `#66ddd2` / `#113d3a` | `.review-tone-1`, `.feedback-tom-1` | `--criterio-pertinencia` |
| `--criterio-2` | `#a16207` / `#faedc4` | `#f0bb64` / `#453512` | `.review-tone-2`, `.feedback-tom-2` | `--criterio-uso` |
| `--criterio-3` | `#be185d` / `#fbe0ed` | `#ff9cc5` / `#4b2238` | `.review-tone-3`, `.feedback-tom-3` | `--criterio-extra-1` |
| `--criterio-4` | `#4d7c0f` / `#e9f2d6` | `#b8d98c` / `#293c18` | `.review-tone-4`, `.feedback-tom-4` | `--criterio-extra-2` |
| `--criterio-neutro` | `#516075` / `#e4e9ef` | `#a9bed1` / `#1b2a3c` | `.review-tone-neutro`, `.feedback-tom-neutro` | sem equivalente (valor atual da #44). O fundo escuro `#1b2a3c` é novo: o código atual não tem fundo neutro de critério no escuro |

As três cópias antigas (`.review-tone-*` em `professor-correction.css`, `.feedback-tom-*` em `aluno-feedback.css` e as listras de turma por índice) serão trocadas por estes tokens no 3b.

## Raio

Raio por tamanho e função, não um valor único (REV-013).

| Token | Valor | Uso | Antigo | Protótipo |
|---|---|---|---|---|
| `--raio-folha` | `0` | Folha da redação. A folha é a única superfície de papel: sem raio e sem sombra | os 14 px de `.review-card` e o `surface-card` na redação | "0 na folha" |
| `--raio-marca` | `4px` | Marcações de trecho, chips pequenos | `--radius-sm` | sem equivalente |
| `--raio-controle` | `6px` | Botões, campos, avisos | `--radius-md`, `rounded-xl`, `rounded-lg`, `rounded-[10px]` | `--raio-controle` |
| `--raio-cartao` | `10px` | Cartões e blocos | `--radius-lg`, `rounded-[14px]` | `--raio-cartao` |
| `--raio-dialogo` | `14px` | Diálogos | `--radius-xl`, `--radius-2xl` (20 px), `rounded-[20px]` | `--raio-dialogo` |
| `--raio-pilula` | `999px` | Etiquetas, trilhos | `--radius-full` | sem equivalente |

No Tailwind: `rounded-marca`, `rounded-controle`, `rounded-cartao`, `rounded-dialogo`, `rounded-pilula`.

## Movimento

| Token | Valor | Antigo | Protótipo |
|---|---|---|---|
| `--rapido` | `120ms` | `transition` de 150 ms (padrão do Tailwind), `160ms` em `.theme-toggle` | `--rapido` |
| `--painel` | `200ms` | `220ms` da folha inferior, `0.2s` de `AuthNotice`, `0.22s` das páginas | `--painel` |
| `--curva` | `cubic-bezier(0.22, 1, 0.36, 1)` | a mesma curva da folha inferior | `--curva` |

`prefers-reduced-motion` continua tratado na regra global de `index.css`. Em botões azuis, nunca usar o utilitário `transition` sem sufixo: ele inclui `outline-color` e faz o anel de foco nascer branco no primeiro quadro (UX-023). Os componentes base usam `transition-[background-color,border-color,filter,opacity]`.

## Tipografia

| Token / classe | Valor | Antigo | Observação |
|---|---|---|---|
| `--fonte-titulo` | Newsreader, Georgia, serif | `--font-display` | Só em título de página, texto da redação e nota (decisão D2) |
| `--fonte-interface` | Inter, system-ui, sans-serif | `--font-interface` | Todo o resto, inclusive `h2` e títulos de diálogo |
| `.fonte-titulo-pagina`, `.fonte-redacao`, `.fonte-nota` | `font-family: var(--fonte-titulo)` | `h1, h2, .brand-wordmark, .font-display, .font-editorial, .font-essay` em `index.css` | As três únicas classes serifadas. A regra global `h1, h2` continua até o 3b, que a remove |
| `.fonte-interface` | `font-family: var(--fonte-interface)` | `.aluno-titulo-interface` | |

### Monoespaçado e algarismos tabulares (N1, REV-014)

**Decisão:** não entra terceira família. O código de turma fica em Inter com `font-variant-numeric: tabular-nums` e tracking aberto (`letter-spacing: 0.08em`), pela classe `.codigo-turma`. Notas, contagens, datas e tamanhos de arquivo usam `.numeros-tabulares` (equivalente ao `tabular-nums` do Tailwind).

**Motivo:** segue o padrão do plano (N1): uma terceira família é decisão de marca, e a conferência da D1 no Figma não informou nenhuma monoespaçada oficial. Inter tem algarismos tabulares. O tracking aberto separa caracteres parecidos (0/O, 1/I) o bastante para o código ser lido um a um.

**Reabrir se:** a marca passar a ter uma família monoespaçada oficial.

## Utilitários do Tailwind gerados dos tokens

`@theme inline` em `tokens.css` expõe os tokens como cores e raios, sem recompilar na troca de tema:

`bg-pagina`, `bg-superficie`, `bg-superficie-rebaixada`, `bg-superficie-campo`, `bg-superficie-flutuante`, `bg-shell`, `text-texto`, `text-texto-suave`, `text-texto-fraco`, `text-texto-sobre-acao`, `text-texto-sobre-shell`, `bg-acao`, `bg-acao-hover`, `text-acao-texto`, `bg-acao-suave`, `text-perigo`, `border-borda`, `border-borda-forte`, `border-borda-campo`, `text-sucesso`, `bg-sucesso-fundo`, `text-atencao`, `bg-atencao-fundo`, `text-erro`, `bg-erro-fundo`, `text-info`, `bg-info-fundo`, `ring-foco`.

## Componentes base e os tokens que usam

| Componente | Arquivo | Tokens |
|---|---|---|
| `Botao` | `components/base/Botao.jsx` | `--acao`, `--acao-hover`, `--texto-sobre-acao`, `--borda-campo`, `--perigo`, `--raio-controle`, `--rapido` |
| `Campo` | `components/base/Campo.jsx` | `--superficie-campo`, `--borda-campo`, `--erro`, `--texto-fraco`, `--foco`, `--raio-controle` |
| `BotaoSenha` (olho) | `components/base/BotaoSenha.jsx` | `--texto-suave`, `--superficie-rebaixada`, `--raio-controle` |
| `Dialogo`, `DialogoConfirmacao` | `components/base/Dialogo.jsx`, `DialogoConfirmacao.jsx`, `base.css` | `--superficie-flutuante`, `--raio-dialogo`, `--sombra-dialogo`, `--contorno-flutuante`, `--veu`, `--painel`, `--curva` |
| `Aviso` | `components/base/Aviso.jsx` | `--erro*`, `--sucesso*`, `--atencao*`, `--info*`, `--raio-controle` |
| `Etiqueta` | `components/base/Etiqueta.jsx` | tons de estado, `--criterio-*` (só no ponto), `--raio-pilula` |
| `EstadoVazio` | `components/base/EstadoVazio.jsx` | `--superficie-rebaixada`, `--borda-forte`, `--raio-cartao` |

## Formatação

`utils/formatar-data.js` é o único lugar com opções de `Intl.DateTimeFormat` e `Intl.RelativeTimeFormat`, com três formas: `data` (`18/10/2026`), `dataHora` (`18/10/2026, 23:59`) e `relativa` (`há 5 minutos`, `em 2 dias`; passados 30 dias, cai para `data`). `utils/formatar-numero.js` centraliza `Intl.NumberFormat` em pt-BR. Os cinco formatos de data e as chamadas dispersas de `toLocaleString` (UX-043, UX-032) são migrados no 3b.
