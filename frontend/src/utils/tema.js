export const CHAVE_TEMA = 'lexis:preferencia:tema'

const TEMAS = ['light', 'dark']

// O tema inicial é sempre o claro. Só uma escolha manual salva o muda; o tema
// do sistema (prefers-color-scheme) não é consultado.
export function decidirTemaInicial(preferenciaSalva) {
  return TEMAS.includes(preferenciaSalva) ? preferenciaSalva : 'light'
}

// Devolve 'light', 'dark' ou null (nada salvo, valor inválido ou armazenamento
// indisponível, como em janela privada ou com cookies bloqueados).
export function lerPreferenciaSalva(armazenamento) {
  try {
    const valor = armazenamento?.getItem(CHAVE_TEMA)

    return TEMAS.includes(valor) ? valor : null
  } catch {
    return null
  }
}
