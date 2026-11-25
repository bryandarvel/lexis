// Reabertura de turma e de proposta (#65 e #69). Os efeitos descritos aqui
// seguem backend/src/modules/turmas e backend/src/modules/temas:
// - reabrir turma mantém o código de acesso, NÃO restaura as matrículas
//   encerradas no arquivamento e NÃO reabre as propostas arquivadas;
// - reabrir proposta exige turma ativa, preserva conteúdo, critérios e o prazo
//   original; se o prazo já venceu, a proposta continua aceitando entrega e a
//   entrega é registrada com atraso.

export const TEXTO_TURMA_ARQUIVADA_BLOQUEIA_PROPOSTA =
  'Esta proposta só pode ser reaberta depois que a turma for reaberta.'

const CODIGOS_JA_ATIVA = {
  turma: 'CLASS_ALREADY_ACTIVE',
  proposta: 'ESSAY_TOPIC_ALREADY_ACTIVE',
}

const CODIGOS_NAO_ENCONTRADA = {
  turma: 'CLASS_NOT_FOUND',
  proposta: 'ESSAY_TOPIC_NOT_FOUND',
}

const ROTULOS = {
  turma: { artigo: 'Esta', nome: 'turma' },
  proposta: { artigo: 'Esta', nome: 'proposta' },
}

// Decide se a ação "Reabrir" deve ser oferecida. `arquivada` é o estado do
// item; `turmaAtiva` só importa para a proposta.
export function descreverReabertura({ tipo, arquivada, turmaAtiva = true }) {
  if (!arquivada) {
    return { oferecer: false, bloqueada: false, motivo: '' }
  }

  if (tipo === 'proposta' && !turmaAtiva) {
    return {
      oferecer: false,
      bloqueada: true,
      motivo: TEXTO_TURMA_ARQUIVADA_BLOQUEIA_PROPOSTA,
    }
  }

  return { oferecer: true, bloqueada: false, motivo: '' }
}

// Lê o código do backend em `error.response.data.error.code` (o util
// interpretarErroApi devolve só a mensagem).
export function mapearErroReabertura(erro, tipo) {
  const rotulo = ROTULOS[tipo] ?? ROTULOS.turma
  const resposta = erro?.response

  if (!resposta) {
    return {
      mensagem: 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.',
      recarregar: false,
      caminhoTurma: false,
    }
  }

  const codigo = resposta.data?.error?.code

  if (codigo === CODIGOS_JA_ATIVA[tipo]) {
    return {
      mensagem: `${rotulo.artigo} ${rotulo.nome} já está ativa. A página foi atualizada com a situação atual.`,
      recarregar: true,
      caminhoTurma: false,
    }
  }

  if (tipo === 'proposta' && codigo === 'CLASS_ARCHIVED') {
    return {
      mensagem: 'Reabra a turma antes de reabrir a proposta.',
      recarregar: true,
      caminhoTurma: true,
    }
  }

  if (resposta.status === 404 || codigo === CODIGOS_NAO_ENCONTRADA[tipo]) {
    return {
      mensagem: `${rotulo.artigo} ${rotulo.nome} não foi encontrada. Ela pode não existir mais ou não estar sob sua responsabilidade.`,
      recarregar: false,
      caminhoTurma: false,
    }
  }

  if (resposta.status === 401) {
    return {
      mensagem: 'Sua sessão expirou. Entre novamente para continuar.',
      recarregar: false,
      caminhoTurma: false,
    }
  }

  return {
    mensagem: resposta.data?.error?.message ?? 'Não foi possível reabrir. Tente novamente.',
    recarregar: false,
    caminhoTurma: false,
  }
}

export function descreverDialogoReabrirTurma(turma) {
  return {
    titulo: `Reabrir a turma “${turma?.nome ?? ''}”?`,
    efeitos: [
      'A turma volta a ficar ativa com o mesmo código de acesso.',
      'As matrículas encerradas no arquivamento não são restauradas: os alunos entram de novo pelo código de acesso.',
      'As propostas arquivadas continuam arquivadas; reabra cada uma na página da proposta.',
      'As redações e as correções já publicadas permanecem.',
    ],
    rotulo: 'Reabrir turma',
    rotuloEnviando: 'Reabrindo…',
  }
}

export function descreverDialogoReabrirProposta(tema) {
  return {
    titulo: `Reabrir a proposta “${tema?.enunciado ?? ''}”?`,
    efeitos: [
      'A proposta volta a aparecer para os alunos da turma.',
      'O conteúdo, os critérios e o prazo original são preservados.',
      'Se o prazo já venceu, os alunos ainda podem enviar e a entrega fica registrada como atrasada.',
      'As redações já enviadas e as correções publicadas permanecem.',
    ],
    rotulo: 'Reabrir proposta',
    rotuloEnviando: 'Reabrindo…',
  }
}

export const MENSAGENS_SUCESSO_REABERTURA = {
  turma: 'Turma reaberta. Os alunos entram de novo pelo código de acesso.',
  proposta: 'Proposta reaberta. Os alunos voltam a vê-la.',
}
