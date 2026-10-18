import { COMPETENCIAS_ENEM } from '../constants/competencias-enem.js'
import {
  calcularPercentual,
  formatarDiaMes,
  listarPropostasDoAluno,
} from './aluno-painel.js'

export const NOTA_MAXIMA_COMPETENCIA = 200
export const NOTA_MAXIMA_TOTAL = 1000

// Quantidade de tons em aluno-feedback.css (.feedback-tom-0 a -4).
export const TOTAL_TONS_CRITERIO = 5

const CAMPO_COMPETENCIA_DESTACADA = 'competencia2'

// A cor depende só da ordem do critério, então não muda quando outros
// critérios ficam sem comentário. Acima do total de tons, a paleta recomeça.
export function obterTomCriterio(ordem) {
  if (!Number.isInteger(ordem) || ordem < 1) {
    return 'neutro'
  }

  return String((ordem - 1) % TOTAL_TONS_CRITERIO)
}

// O backend só envia critérios comentados; o filtro protege contra
// comentários vazios e a ordenação não depende da ordem recebida.
export function organizarCriteriosComentados(criterios) {
  return (Array.isArray(criterios) ? criterios : [])
    .filter(
      (item) =>
        typeof item?.comentario === 'string' &&
        item.comentario.trim(),
    )
    .map((item) => {
      const ordem = Number.isInteger(item.criterio?.ordem)
        ? item.criterio.ordem
        : null

      return {
        id: item.id ?? item.criterioId,
        nome: item.criterio?.nome?.trim() || 'Critério',
        ordem,
        comentario: item.comentario.trim(),
        tom: obterTomCriterio(ordem),
      }
    })
    .sort(
      (a, b) =>
        (a.ordem ?? Infinity) - (b.ordem ?? Infinity) ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    )
}

export function listarNotasCompetencias(feedback) {
  return COMPETENCIAS_ENEM.map(
    ({ campo, numero, titulo }) => {
      const nota = Number.isInteger(feedback?.[campo])
        ? feedback[campo]
        : null

      return {
        campo,
        numero,
        titulo,
        nota,
        percentual:
          nota === null
            ? 0
            : calcularPercentual(
                nota,
                NOTA_MAXIMA_COMPETENCIA,
              ),
        destaque: campo === CAMPO_COMPETENCIA_DESTACADA,
      }
    },
  )
}

// Correções legadas podem ter só a nota total, sem as competências.
export function possuiNotasCompetencias(competencias) {
  return competencias.some(
    (competencia) => competencia.nota !== null,
  )
}

export function descreverVersaoFeedback(feedback) {
  const numero = Number.isInteger(feedback?.numero)
    ? feedback.numero
    : null

  return {
    rotulo: numero
      ? `Versão ${numero} · publicada`
      : 'Versão publicada',
    atualizada: numero !== null && numero > 1,
  }
}

// Monta os trechos do subtítulo: tema, envio e publicação. O nome vem do
// professor da turma, o único que pode publicar a correção.
export function descreverOrigemFeedback({
  redacao,
  feedback,
}) {
  const enviadaEm = formatarDiaMes(redacao?.enviadaEm)
  const publicadaEm = formatarDiaMes(feedback?.publicadoEm)
  const professor =
    redacao?.tema?.turma?.professor?.nome?.trim()

  return [
    redacao?.tema?.enunciado?.trim(),
    enviadaEm && `enviada em ${enviadaEm}`,
    publicadaEm &&
      (professor
        ? `publicada em ${publicadaEm} por ${professor}`
        : `publicada em ${publicadaEm}`),
  ].filter(Boolean)
}

// Mesma regra do Painel: o item "Enviar redação" leva à primeira proposta
// que ainda aceita envio.
export function obterRotaEnviarRedacao(
  temas,
  redacoes,
  agora = new Date(),
) {
  const proposta = listarPropostasDoAluno(
    temas,
    redacoes,
    agora,
  ).find((item) => item.podeEnviar)?.proposta

  return proposta
    ? `/aluno/temas/${encodeURIComponent(proposta.id)}/redacao`
    : null
}

export function selecionarNotificacoesNaoLidasDaRedacao(
  notificacoes,
  redacaoId,
) {
  if (!Array.isArray(notificacoes) || !redacaoId) {
    return []
  }

  return notificacoes
    .filter(
      (notificacao) =>
        !notificacao?.lidaEm &&
        notificacao?.feedbackVersao?.feedback?.redacaoId ===
          redacaoId,
    )
    .map((notificacao) => notificacao.id)
}

function respondeuNaoEncontrado(resultado) {
  return (
    resultado?.status === 'rejected' &&
    resultado.reason?.response?.status === 404
  )
}

// Recebe os resultados de Promise.allSettled para a redação e o feedback.
// O backend responde 404 tanto para redação alheia quanto para correção
// ainda não publicada; a redação carregada distingue os dois casos.
export function classificarCarregamentoFeedback(
  resultadoRedacao,
  resultadoFeedback,
) {
  if (resultadoRedacao?.status !== 'fulfilled') {
    return respondeuNaoEncontrado(resultadoRedacao)
      ? { status: 'nao-encontrada' }
      : { status: 'erro' }
  }

  const redacao = resultadoRedacao.value

  if (resultadoFeedback?.status === 'fulfilled') {
    return {
      status: 'pronto',
      redacao,
      feedback: resultadoFeedback.value,
    }
  }

  return respondeuNaoEncontrado(resultadoFeedback)
    ? { status: 'nao-publicada', redacao }
    : { status: 'erro' }
}

export function descreverFeedbackIndisponivel(redacao) {
  if (redacao?.status === 'RASCUNHO') {
    return {
      titulo: 'Esta redação ainda não foi enviada',
      mensagem:
        'A correção só existe depois do envio. Você pode continuar o rascunho no editor.',
      acao: {
        rotulo: 'Abrir o editor',
        destino: `/aluno/temas/${encodeURIComponent(redacao.temaId)}/redacao`,
      },
    }
  }

  return {
    titulo: 'A correção ainda não foi publicada',
    mensagem:
      'Sua redação foi enviada e aguarda correção. Você recebe uma notificação quando ela for publicada.',
    acao: {
      rotulo: 'Voltar ao início',
      destino: '/aluno',
    },
  }
}
