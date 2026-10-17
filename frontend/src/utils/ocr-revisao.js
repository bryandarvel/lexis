export const PASSOS_ENVIO_FOTO = [
  {
    rotulo: 'Foto enviada',
    estado: 'concluido',
  },
  {
    rotulo: 'Texto extraído',
    estado: 'concluido',
  },
  {
    rotulo: 'Você revisa',
    estado: 'atual',
  },
  {
    rotulo: 'Entrega',
    estado: 'pendente',
  },
]

// Deriva o rótulo da etapa da própria lista, para que o subtítulo e o
// indicador de etapas não divirjam.
export function descreverEtapaAtual(passos = PASSOS_ENVIO_FOTO) {
  const indice = passos.findIndex(
    (passo) => passo.estado === 'atual',
  )

  return indice === -1
    ? null
    : `Etapa ${indice + 1} de ${passos.length}`
}

export function formatarTamanhoArquivo(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return ''
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', {
      maximumFractionDigits: 1,
    })} MB`
  }

  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} KB`
}

export function descreverArquivo(arquivo) {
  if (!arquivo?.name) {
    return ''
  }

  const tamanho = formatarTamanhoArquivo(arquivo.size)

  return tamanho
    ? `${arquivo.name} · ${tamanho}`
    : arquivo.name
}

export function mensagemErroRevisaoOcr(erro) {
  if (!erro?.response) {
    return 'Não foi possível conectar ao servidor para salvar a transcrição. Verifique sua conexão; o texto revisado continua aqui.'
  }

  const erroApi = erro.response.data?.error
  const erroDoTexto = Array.isArray(erroApi?.details)
    ? erroApi.details.find(
        (detalhe) => detalhe?.field === 'texto',
      )?.message
    : null

  return (
    erroDoTexto ??
    erroApi?.message ??
    'Não foi possível salvar a transcrição revisada. O texto continua aqui; tente novamente.'
  )
}
