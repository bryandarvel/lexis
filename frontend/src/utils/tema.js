export const CHAVE_TEMA = 'lexis:preferencia:tema'

const TEMAS = ['light', 'dark']

// Ler a própria propriedade `localStorage` pode lançar (SecurityError em
// contexto com armazenamento bloqueado), e não só os métodos dela. Por isso o
// acessor é uma função, chamada sempre dentro do try.
const armazenamentoPadrao = () => globalThis.localStorage

// O tema inicial é sempre o claro. Só uma escolha manual salva o muda; o tema
// do sistema (prefers-color-scheme) não é consultado.
export function decidirTemaInicial(preferenciaSalva) {
  return TEMAS.includes(preferenciaSalva) ? preferenciaSalva : 'light'
}

// Devolve 'light', 'dark' ou null (nada salvo, valor inválido ou armazenamento
// indisponível, como em janela privada ou com cookies bloqueados).
export function lerPreferenciaSalva(
  obterArmazenamento = armazenamentoPadrao,
) {
  try {
    const valor = obterArmazenamento()?.getItem(CHAVE_TEMA)

    return TEMAS.includes(valor) ? valor : null
  } catch {
    return null
  }
}

// Devolve true quando gravou. A preferência continua válida durante a sessão
// mesmo que o armazenamento recuse a escrita.
export function gravarPreferencia(
  tema,
  obterArmazenamento = armazenamentoPadrao,
) {
  try {
    obterArmazenamento()?.setItem(CHAVE_TEMA, tema)

    return true
  } catch {
    return false
  }
}

// Classe posta na raiz só durante a troca: suspende as transições de cor para
// que nada mude de cor em tempos diferentes (nenhuma animação acima de 1 ms).
export const CLASSE_TROCANDO_TEMA = 'tema-trocando'

// Aplica o tema na raiz do documento, de forma síncrona e instantânea. Sem
// `suspenderTransicoes`, só escreve data-theme e color-scheme. Com ele, as
// transições de cor ficam desligadas até dois quadros depois da troca. Devolve
// a função que desfaz a suspensão (usada na limpeza do efeito).
export function aplicarTemaNoDocumento(
  raiz,
  tema,
  {
    suspenderTransicoes = false,
    agendarQuadro = globalThis.requestAnimationFrame?.bind(globalThis),
  } = {},
) {
  if (suspenderTransicoes) raiz.classList.add(CLASSE_TROCANDO_TEMA)

  raiz.dataset.theme = tema
  raiz.style.colorScheme = tema

  if (!suspenderTransicoes) return () => {}

  const religar = () => raiz.classList.remove(CLASSE_TROCANDO_TEMA)

  if (!agendarQuadro) {
    religar()
    return () => {}
  }

  let cancelado = false

  // O primeiro quadro pinta o tema novo sem transição; o segundo já é seguro
  // para religá-las, porque nenhum valor muda na volta.
  agendarQuadro(() => {
    agendarQuadro(() => {
      if (!cancelado) religar()
    })
  })

  return () => {
    cancelado = true
    religar()
  }
}
