// Rótulos, ordenação e resumo da gestão da turma. Os efeitos descritos aqui
// seguem backend/src/modules/turmas: arquivar encerra todas as matrículas
// ativas e desvincular encerra apenas a matrícula do aluno; nos dois casos as
// redações e os feedbacks permanecem.

export function descreverSituacaoTurma(turma) {
  const ativa = turma?.ativa !== false

  return {
    ativa,
    rotulo: ativa ? 'Ativa' : 'Arquivada',
    // Toda alteração de turma exige turma ativa no backend.
    podeGerenciar: ativa,
  }
}

export function descreverSituacaoAluno(matricula) {
  if (matricula?.aluno?.ativo === false) {
    return { rotulo: 'Conta desativada', atencao: true }
  }

  if (matricula?.status === 'ENCERRADA') {
    return { rotulo: 'Matrícula encerrada', atencao: true }
  }

  return { rotulo: 'Matrícula ativa', atencao: false }
}

export function ordenarAlunosDaTurma(matriculas) {
  if (!Array.isArray(matriculas)) {
    return []
  }

  return [...matriculas].sort((primeira, segunda) => {
    const nomePrimeira = primeira?.aluno?.nome ?? ''
    const nomeSegunda = segunda?.aluno?.nome ?? ''
    const comparacao = nomePrimeira.localeCompare(nomeSegunda, 'pt-BR', {
      sensitivity: 'base',
    })

    if (comparacao !== 0) {
      return comparacao
    }

    return (primeira?.aluno?.email ?? '').localeCompare(
      segunda?.aluno?.email ?? '',
      'pt-BR',
    )
  })
}

export function resumirAlunosDaTurma(matriculas) {
  const lista = Array.isArray(matriculas) ? matriculas : []
  const desativados = lista.filter(
    (matricula) => matricula?.aluno?.ativo === false,
  ).length

  return {
    total: lista.length,
    desativados,
    rotulo: lista.length === 1 ? '1 aluno ativo' : `${lista.length} alunos ativos`,
  }
}

export function formatarDataEntrada(valor) {
  if (!valor) {
    return 'Data indisponível'
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return 'Data indisponível'
  }

  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(data)
}
