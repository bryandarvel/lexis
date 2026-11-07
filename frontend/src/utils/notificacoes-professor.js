/*
 * Avisos do professor (#72).
 *
 * REDACAO_ENVIADA e ALUNO_SAIU_TURMA chegam com feedbackVersao nulo: o destino
 * sai de redacaoId e da turma, nunca do feedback. Um tipo que o backend venha
 * a acrescentar cai no caminho seguro, só marcando como lido.
 */
function texto(valor) {
  const limpo = typeof valor === 'string' ? valor.trim() : ''

  return limpo === '' ? null : limpo
}

function obterIdRedacao(notificacao) {
  return (
    texto(notificacao?.redacaoId) ?? texto(notificacao?.redacao?.id)
  )
}

function obterIdTurma(notificacao) {
  return (
    texto(notificacao?.turma?.id) ??
    texto(notificacao?.redacao?.tema?.turma?.id)
  )
}

function semDestino(notificacao) {
  const lido = Boolean(notificacao?.lidaEm)

  return {
    destino: null,
    rotulo: lido ? 'Lido' : 'Marcar como lido',
    rotuloProcessando: 'Marcando como lido...',
    acionavel: !lido,
  }
}

export function descreverAvisoProfessor(notificacao) {
  const proposta = texto(notificacao?.redacao?.tema?.enunciado)
  const turma =
    texto(notificacao?.turma?.nome) ??
    texto(notificacao?.redacao?.tema?.turma?.nome)
  const contexto = { proposta, turma }

  if (notificacao?.tipo === 'REDACAO_ENVIADA') {
    const redacaoId = obterIdRedacao(notificacao)

    if (redacaoId) {
      return {
        ...contexto,
        destino: `/professor/redacoes/${encodeURIComponent(redacaoId)}`,
        rotulo: 'Ver redação →',
        rotuloProcessando: 'Abrindo redação...',
        acionavel: true,
      }
    }
  }

  if (notificacao?.tipo === 'ALUNO_SAIU_TURMA') {
    const turmaId = obterIdTurma(notificacao)

    if (turmaId) {
      return {
        ...contexto,
        destino: `/professor/turmas/${encodeURIComponent(turmaId)}`,
        rotulo: 'Ver turma →',
        rotuloProcessando: 'Abrindo turma...',
        acionavel: true,
      }
    }
  }

  return { ...contexto, ...semDestino(notificacao) }
}
