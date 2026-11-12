/*
 * Avisos do professor (#72).
 *
 * REDACAO_ENVIADA chega com feedbackVersao nulo: o destino sai de redacaoId, nunca do
 * feedback. ALUNO_SAIU_TURMA chega sem redacaoId e sem o id da turma (o backend só grava
 * título e mensagem), então não há para onde levar: só pode ser marcado como lido. Um tipo
 * que o backend venha a acrescentar cai no mesmo caminho seguro.
 */

import { interpretarErroApi } from './api-error.js'
import { aplicarLeitura } from './notificacoes-sequencia.js'

function texto(valor) {
  const limpo = typeof valor === 'string' ? valor.trim() : ''

  return limpo === '' ? null : limpo
}

function obterIdRedacao(notificacao) {
  return (
    texto(notificacao?.redacaoId) ?? texto(notificacao?.redacao?.id)
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
    // Nunca oferece abrir a turma: o payload não traz o id dela.
    return {
      ...contexto,
      ...semDestino(notificacao),
      orientacao: 'Este aviso só informa a saída. Para ver a turma, abra Turmas no menu.',
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

// Marca o aviso como lido e refaz a contagem a partir da lista: lista e sino usam este mesmo
// número, e ler de novo um aviso já lido não decrementa. A regra é a de aplicarLeitura, comum às
// duas centrais, que também avança a geração e descarta consultas em voo.
export function registrarLeitura(estado, notificacaoAtualizada) {
  return aplicarLeitura(estado, notificacaoAtualizada)
}
