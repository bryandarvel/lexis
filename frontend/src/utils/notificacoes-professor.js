/*
 * Avisos do professor (#72).
 *
 * REDACAO_ENVIADA e ALUNO_SAIU_TURMA chegam com feedbackVersao nulo: o destino
 * sai de redacaoId e da turma, nunca do feedback. Um tipo que o backend venha
 * a acrescentar cai no caminho seguro, só marcando como lido.
 */

import { interpretarErroApi } from './api-error.js'

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

// A tela renderiza esta mensagem direto no JSX: precisa ser texto, nunca o
// objeto devolvido por interpretarErroApi (que tem mensagem e campos). Com o
// objeto, o React quebra a renderização e a página fica em branco.
export function mensagemDeFalha(erro, padrao) {
  // interpretarErroApi lê erro.response e quebra sem um erro de verdade.
  const { mensagem } = erro
    ? interpretarErroApi(erro, padrao)
    : { mensagem: padrao }

  return typeof mensagem === 'string' && mensagem.trim() !== ''
    ? mensagem
    : padrao
}
