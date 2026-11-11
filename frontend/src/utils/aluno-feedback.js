import {
  TOM_NEUTRO,
  TOTAL_TONS_CRITERIO,
  obterTomCriterio,
} from './criterio-cores.js'
import { COMPETENCIAS_ENEM } from '../constants/competencias-enem.js'
import { segmentarTextoComEvidencias } from './ai-evidence.js'
import { validarTrechosRecebidos } from './trechos-feedback.js'
import {
  calcularPercentual,
  formatarDiaMes,
  listarPropostasDoAluno,
} from './aluno-painel.js'

export const NOTA_MAXIMA_COMPETENCIA = 200
export const NOTA_MAXIMA_TOTAL = 1000

// A cor do critério é a mesma da correção do professor: vem de
// utils/criterio-cores.js, para o mapeamento não divergir entre as telas.
export { TOM_NEUTRO, TOTAL_TONS_CRITERIO, obterTomCriterio }

const CAMPO_COMPETENCIA_DESTACADA = 'competencia2'

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

/*
 * Trechos marcados no texto publicado (#42).
 *
 * O aluno recebe trechos[{id, inicio, fim, trecho, sugeridoPorIa}] em cada
 * comentário, sem analiseIaId nem diagnóstico. A tela só marca o que ainda
 * coincide com o texto publicado; o resto é descartado, para nunca destacar o
 * lugar errado. A origem por IA não é exibida: significa apenas coincidência
 * com uma sugestão mantida pelo professor, não que o repertório seja verdadeiro.
 */
export function montarTextoComTrechos(texto, criterios) {
  const conteudo = typeof texto === 'string' ? texto : ''
  const porOrdem = new Map()

  for (const item of Array.isArray(criterios) ? criterios : []) {
    const ordem = Number.isInteger(item?.criterio?.ordem)
      ? item.criterio.ordem
      : null
    const validos = validarTrechosRecebidos(conteudo, item?.trechos)

    if (ordem === null || validos.length === 0) {
      continue
    }

    const atual = porOrdem.get(ordem) ?? {
      ordem,
      nome: item.criterio?.nome?.trim() || 'Critério',
      tom: obterTomCriterio(ordem),
      evidencias: [],
    }

    // segmentarTextoComEvidencias espera o formato das evidências da análise.
    atual.evidencias.push(
      ...validos.map((trecho) => ({
        inicio: trecho.inicio,
        fim: trecho.fim,
        trecho: trecho.trecho,
        statusLocalizacao: 'LOCALIZADA',
      })),
    )
    porOrdem.set(ordem, atual)
  }

  const comTrechos = [...porOrdem.values()].sort((a, b) => a.ordem - b.ordem)

  if (comTrechos.length === 0) {
    return { segmentos: [], legenda: [], total: 0 }
  }

  return {
    segmentos: segmentarTextoComEvidencias(conteudo, comTrechos),
    legenda: comTrechos.map(({ ordem, nome, tom, evidencias }) => ({
      ordem,
      nome,
      tom,
      quantidade: evidencias.length,
    })),
    total: comTrechos.reduce((soma, c) => soma + c.evidencias.length, 0),
  }
}

// Nome acessível de um segmento marcado: diz quais critérios o apoiam, em vez
// de depender só da cor.
export function descreverSegmentoMarcado(segmento, legenda) {
  const nomes = (segmento?.criterios ?? [])
    .map((ordem) => legenda.find((item) => item.ordem === ordem)?.nome)
    .filter(Boolean)

  if (nomes.length === 0) {
    return ''
  }

  return `Trecho comentado em ${nomes.join(', ')}: ${segmento.texto}`
}
