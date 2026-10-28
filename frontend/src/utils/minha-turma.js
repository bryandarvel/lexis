export const CODIGO_SEM_MATRICULA = 'ACTIVE_ENROLLMENT_NOT_FOUND'
export const CODIGO_TURMA_INDISPONIVEL = 'CLASS_ACCESS_CODE_INVALID'

// interpretarErroApi não expõe o código; ele é lido direto da resposta.
export function obterCodigoErroApi(erro) {
  return erro?.response?.data?.error?.code ?? null
}

export function indicaSemMatricula(erro) {
  return (
    erro?.response?.status === 404 &&
    obterCodigoErroApi(erro) === CODIGO_SEM_MATRICULA
  )
}

export function formatarDataEntrada(valor) {
  const data = valor ? new Date(valor) : null

  if (!data || Number.isNaN(data.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data)
}

export function descreverMatricula(matricula) {
  if (!matricula?.turma) {
    return null
  }

  return {
    turmaId: matricula.turma.id,
    turma: matricula.turma.nome?.trim() || 'Turma',
    professor:
      matricula.turma.professor?.nome?.trim() || null,
    desde: formatarDataEntrada(matricula.iniciadaEm),
    // Arquivar a turma encerra as matrículas; a saída não é oferecida nesse caso.
    podeSair: matricula.turma.ativa !== false,
  }
}

// Redações da turma que o aluno deixa para trás: rascunhos ficam salvos e
// as enviadas continuam em correção. Avaliadas não entram na lista.
export function listarPendenciasDaSaida(redacoes, turmaId) {
  const daTurma = (Array.isArray(redacoes) ? redacoes : [])
    .filter(
      (redacao) =>
        turmaId && redacao?.tema?.turma?.id === turmaId,
    )
    .map((redacao) => ({
      id: redacao.id,
      status: redacao.status,
      enunciado:
        redacao.tema?.enunciado?.trim() || 'Proposta sem título',
    }))
    .sort((a, b) =>
      a.enunciado.localeCompare(b.enunciado, 'pt-BR'),
    )

  return {
    rascunhos: daTurma.filter(
      (redacao) => redacao.status === 'RASCUNHO',
    ),
    aguardandoCorrecao: daTurma.filter(
      (redacao) => redacao.status === 'ENVIADA',
    ),
  }
}

export function mensagemSaidaDaTurma(turma) {
  const nome = typeof turma === 'string' ? turma.trim() : ''

  return nome
    ? `Você saiu da turma ${nome}. Para entrar em outra, use o código de acesso abaixo.`
    : 'Você saiu da turma. Para entrar em outra, use o código de acesso abaixo.'
}

export function mensagemErroMinhaTurma(erro) {
  if (!erro?.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
  }

  const codigo = obterCodigoErroApi(erro)

  if (codigo === CODIGO_SEM_MATRICULA) {
    return 'Você não está mais matriculado em uma turma. O painel foi atualizado.'
  }

  if (codigo === CODIGO_TURMA_INDISPONIVEL) {
    return 'Esta turma não está mais disponível. Ela pode ter sido arquivada pelo professor.'
  }

  return (
    erro.response.data?.error?.message ??
    'Não foi possível concluir a ação. Tente novamente.'
  )
}
