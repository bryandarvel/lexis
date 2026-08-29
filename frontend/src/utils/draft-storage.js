export const RASCUNHO_PREFIXO = 'lexis:rascunho:'
export const RASCUNHO_LIMITE_BYTES = 200_000

const VERSAO_RASCUNHO = 1
const LIMITE_RASCUNHOS = 5

export function criarChaveRascunho(
  usuarioId,
  redacaoId,
) {
  if (!usuarioId || !redacaoId) {
    return null
  }

  return `${RASCUNHO_PREFIXO}${usuarioId}:correcao:${redacaoId}`
}

function tamanhoEmBytes(valor) {
  return new TextEncoder().encode(valor).byteLength
}

function obterStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function lerRascunho(chave) {
  const storage = obterStorage()

  if (!storage || !chave) {
    return null
  }

  try {
    const bruto = storage.getItem(chave)

    if (!bruto) {
      return null
    }

    const envelope = JSON.parse(bruto)

    if (
      envelope?.versao !== VERSAO_RASCUNHO ||
      !envelope.valor ||
      typeof envelope.valor !== 'object'
    ) {
      storage.removeItem(chave)
      return null
    }

    return envelope
  } catch {
    try {
      storage.removeItem(chave)
    } catch {
      // Armazenamento indisponível; a edição continua em memória.
    }
    return null
  }
}

function listarRascunhos(storage, prefixo) {
  return Object.keys(storage)
    .filter((chave) => chave.startsWith(prefixo))
    .map((chave) => ({
      chave,
      atualizadoEm:
        lerRascunho(chave)?.atualizadoEm ?? '',
    }))
    .sort((a, b) =>
      a.atualizadoEm.localeCompare(b.atualizadoEm),
    )
}

function liberarEspaco(storage) {
  const rascunhos = listarRascunhos(
    storage,
    RASCUNHO_PREFIXO,
  )

  rascunhos
    .slice(0, Math.max(1, rascunhos.length - LIMITE_RASCUNHOS + 1))
    .forEach(({ chave }) => storage.removeItem(chave))
}

export function salvarRascunho(chave, valor) {
  const storage = obterStorage()

  if (!storage || !chave) {
    return null
  }

  const envelope = {
    versao: VERSAO_RASCUNHO,
    atualizadoEm: new Date().toISOString(),
    valor,
  }
  const serializado = JSON.stringify(envelope)

  if (
    tamanhoEmBytes(serializado) >
    RASCUNHO_LIMITE_BYTES
  ) {
    return null
  }

  try {
    storage.setItem(chave, serializado)
    return envelope
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') {
      return null
    }

    try {
      liberarEspaco(storage)
      storage.setItem(chave, serializado)
      return envelope
    } catch {
      return null
    }
  }
}

export function removerRascunho(chave) {
  const storage = obterStorage()

  if (!storage || !chave) {
    return
  }

  try {
    storage.removeItem(chave)
  } catch {
    // O estado em memória continua utilizável.
  }
}

export function limparRascunhosUsuario(usuarioId) {
  const storage = obterStorage()

  if (!storage || !usuarioId) {
    return
  }

  const prefixo = `${RASCUNHO_PREFIXO}${usuarioId}:`

  try {
    Object.keys(storage)
      .filter((chave) => chave.startsWith(prefixo))
      .forEach((chave) => storage.removeItem(chave))
  } catch {
    // Logout não pode depender da disponibilidade do storage.
  }
}
