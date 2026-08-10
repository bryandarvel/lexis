import { env } from '../../config/env.js'
import {
  gerarConteudoComGemini,
} from '../../integrations/gemini.client.js'
import { AppError } from '../../utils/app-error.js'

import {
  criarSolicitacaoAnaliseIa,
  VERSAO_PROMPT_ANALISE_IA,
} from './analise-ia.prompt.js'
import {
  concluirAnaliseIa,
  falharAnaliseIa,
  iniciarAnaliseIa,
  listarAnalisesIa,
} from './analise-ia.repository.js'
import {
  interpretarResultadoAnaliseIa,
} from './analise-ia.schemas.js'

function criarErroRedacaoNaoEncontrada() {
  return new AppError(
    'A redação não foi encontrada ou não está disponível para análise.',
    {
      statusCode: 404,
      code: 'ESSAY_NOT_FOUND',
    },
  )
}

function criarErroTextoAusente() {
  return new AppError(
    'A redação não possui texto para análise.',
    {
      statusCode: 422,
      code: 'ESSAY_TEXT_REQUIRED',
    },
  )
}

function criarErroCriteriosAusentes() {
  return new AppError(
    'O tema não possui critérios para análise.',
    {
      statusCode: 409,
      code: 'EVALUATION_CRITERIA_REQUIRED',
    },
  )
}

function criarErroAnaliseEmAndamento() {
  return new AppError(
    'Já existe uma análise em processamento para esta redação.',
    {
      statusCode: 409,
      code: 'AI_ANALYSIS_IN_PROGRESS',
    },
  )
}

function tratarInicioDaAnalise(resultado) {
  if (resultado.status === 'REDACAO_INDISPONIVEL') {
    throw criarErroRedacaoNaoEncontrada()
  }

  if (resultado.status === 'TEXTO_AUSENTE') {
    throw criarErroTextoAusente()
  }

  if (resultado.status === 'CRITERIOS_AUSENTES') {
    throw criarErroCriteriosAusentes()
  }

  if (resultado.status === 'ANALISE_EM_ANDAMENTO') {
    throw criarErroAnaliseEmAndamento()
  }

  return resultado
}

function obterMensagemSeguraDoErro(erro) {
  if (erro instanceof AppError) {
    return `${erro.code}: ${erro.message}`
  }

  return 'UNEXPECTED_AI_ANALYSIS_ERROR'
}

function limitarMensagemErro(mensagem) {
  return mensagem.slice(0, 2000)
}

export async function solicitarAnaliseIaParaProfessor(
  {
    redacaoId,
    professorId,
  },
  {
    iniciar = iniciarAnaliseIa,
    gerar = gerarConteudoComGemini,
    concluir = concluirAnaliseIa,
    falhar = falharAnaliseIa,
    criarSolicitacao = criarSolicitacaoAnaliseIa,
    interpretar = interpretarResultadoAnaliseIa,
    agora = () => new Date(),
    obterTempoMs = () => Date.now(),
  } = {},
) {
  const iniciadaEm = agora()
  const inicioMs = obterTempoMs()

  const inicio = tratarInicioDaAnalise(
    await iniciar({
      redacaoId,
      professorId,
      modelo: env.GEMINI_MODEL,
      versaoPrompt: VERSAO_PROMPT_ANALISE_IA,
      iniciadaEm,
    }),
  )

  const solicitacao = criarSolicitacao({
    texto: inicio.redacao.texto,
    tema: inicio.redacao.tema,
    criterios: inicio.redacao.tema.criterios,
  })

  try {
    const resposta = await gerar({
      input: solicitacao.input,
      systemInstruction:
        solicitacao.systemInstruction,
      responseFormat:
        solicitacao.responseFormat,
      generationConfig:
        solicitacao.generationConfig,
    })

    const resultadoEstruturado = interpretar({
      texto: resposta.texto,
      criterios: inicio.redacao.tema.criterios,
    })

    return concluir({
      analiseId: inicio.analise.id,
      resultadoEstruturado,
      duracaoMs: Math.max(
        0,
        obterTempoMs() - inicioMs,
      ),
      concluidaEm: agora(),
    })
  } catch (erro) {
    const duracaoMs = Math.max(
      0,
      obterTempoMs() - inicioMs,
    )

    try {
      await falhar({
        analiseId: inicio.analise.id,
        mensagemErro: limitarMensagemErro(
          obterMensagemSeguraDoErro(erro),
        ),
        duracaoMs,
        concluidaEm: agora(),
      })
    } catch {
      // A falha original da análise deve ser preservada.
    }

    throw erro
  }
}

export async function listarAnalisesIaParaProfessor(
  {
    redacaoId,
    professorId,
  },
  {
    listar = listarAnalisesIa,
  } = {},
) {
  const resultado = await listar({
    redacaoId,
    professorId,
  })

  if (resultado.status === 'REDACAO_INDISPONIVEL') {
    throw criarErroRedacaoNaoEncontrada()
  }

  return resultado.analises
}
