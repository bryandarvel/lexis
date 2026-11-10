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
