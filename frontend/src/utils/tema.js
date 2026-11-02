export const CHAVE_TEMA = 'lexis:preferencia:tema'

const TEMAS = ['light', 'dark']

// A escolha do usuário vence sempre. Sem escolha salva, ou com valor
// inesperado, o tema acompanha o sistema.
export function decidirTemaInicial(
  preferenciaSalva,
  preferenciaDoSistema,
) {
  if (TEMAS.includes(preferenciaSalva)) {
    return preferenciaSalva
  }

  return preferenciaDoSistema === 'dark' ? 'dark' : 'light'
}

// O armazenamento pode falhar em janela privada ou com cookies bloqueados.
export function lerPreferenciaSalva(armazenamento) {
  try {
    return armazenamento?.getItem(CHAVE_TEMA) ?? null
  } catch {
    return null
  }
}

export function lerPreferenciaDoSistema(consultarMidia) {
  try {
    return consultarMidia?.('(prefers-color-scheme: dark)')?.matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}
