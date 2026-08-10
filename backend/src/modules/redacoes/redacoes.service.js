import {
  extrairTextoComOcrSpace,
} from '../../integrations/ocrSpace.client.js'
import { AppError } from '../../utils/app-error.js'

import {
  buscarRedacaoDoAluno,
  buscarRedacaoDoProfessor,
  buscarTurmaDoProfessor,
  enviarRedacaoDoAluno,
  listarRedacoesDaTurmaDoProfessor,
  listarRedacoesDoAluno,
  salvarRascunhoDigitado,
  salvarRascunhoOcr,
  verificarDisponibilidadeRascunhoOcr,
} from './redacoes.repository.js'

const LIMITE_CARACTERES_REDACAO = 20000

function criarErroTemaIndisponivel() {
  return new AppError(
    'O tema não foi encontrado ou não está disponível para este aluno.',
    {
      statusCode: 404,
      code: 'ESSAY_TOPIC_NOT_FOUND',
    },
  )
}

function criarErroRedacaoImutavel() {
  return new AppError(
    'A redação já foi enviada e não pode mais ser alterada ou reenviada.',
    {
      statusCode: 409,
      code: 'ESSAY_ALREADY_SUBMITTED',
    },
  )
}

function criarErroRascunhoNaoEncontrado() {
  return new AppError(
    'Salve um rascunho antes de enviar a redação.',
    {
      statusCode: 404,
      code: 'ESSAY_DRAFT_NOT_FOUND',
    },
  )
}

function criarErroTextoAusente() {
  return new AppError(
    'A redação precisa possuir um texto antes do envio.',
    {
      statusCode: 422,
      code: 'ESSAY_TEXT_REQUIRED',
    },
  )
}

function criarErroRevisaoOcrObrigatoria() {
  return new AppError(
    'Revise e salve o texto extraído antes de enviar a redação.',
    {
      statusCode: 409,
      code: 'ESSAY_OCR_REVIEW_REQUIRED',
    },
  )
}

function criarErroTextoOcrMuitoLongo() {
  return new AppError(
    'O texto extraído ultrapassa o limite permitido para uma redação.',
    {
      statusCode: 422,
      code: 'OCR_TEXT_TOO_LONG',
      details: {
        limiteCaracteres:
          LIMITE_CARACTERES_REDACAO,
      },
    },
  )
}

function criarErroRedacaoNaoEncontrada() {
  return new AppError(
    'A redação não foi encontrada.',
    {
      statusCode: 404,
      code: 'ESSAY_NOT_FOUND',
    },
  )
}

function criarErroTurmaNaoEncontrada() {
  return new AppError(
    'A turma não foi encontrada.',
    {
      statusCode: 404,
      code: 'CLASS_NOT_FOUND',
    },
  )
}

function tratarResultadoDaEscrita(resultado) {
  if (resultado.status === 'TEMA_INDISPONIVEL') {
    throw criarErroTemaIndisponivel()
  }

  if (resultado.status === 'REDACAO_IMUTAVEL') {
    throw criarErroRedacaoImutavel()
  }

  if (resultado.status === 'RASCUNHO_INEXISTENTE') {
    throw criarErroRascunhoNaoEncontrado()
  }

  if (resultado.status === 'TEXTO_AUSENTE') {
    throw criarErroTextoAusente()
  }

  if (resultado.status === 'OCR_NAO_REVISADO') {
    throw criarErroRevisaoOcrObrigatoria()
  }

  return resultado.redacao
}

function tratarDisponibilidadeOcr(resultado) {
  if (resultado.status === 'TEMA_INDISPONIVEL') {
    throw criarErroTemaIndisponivel()
  }

  if (resultado.status === 'REDACAO_IMUTAVEL') {
    throw criarErroRedacaoImutavel()
  }
}

function obterNomeSeguroDaImagem(mimetype) {
  return mimetype === 'image/png'
    ? 'redacao.png'
    : 'redacao.jpg'
}

export async function salvarRascunhoParaAluno({
  temaId,
  alunoId,
  texto,
}) {
  const resultado = await salvarRascunhoDigitado({
    temaId,
    alunoId,
    texto,
    revisadaEm: new Date(),
  })

  return tratarResultadoDaEscrita(resultado)
}

export async function transcreverImagemParaAluno({
  temaId,
  alunoId,
  arquivo,
}) {
  const disponibilidade =
    await verificarDisponibilidadeRascunhoOcr({
      temaId,
      alunoId,
    })

  tratarDisponibilidadeOcr(disponibilidade)

  const resultadoOcr =
    await extrairTextoComOcrSpace({
      buffer: arquivo.buffer,
      mimetype: arquivo.mimetype,
      nomeArquivo: obterNomeSeguroDaImagem(
        arquivo.mimetype,
      ),
    })

  if (
    resultadoOcr.texto.length >
    LIMITE_CARACTERES_REDACAO
  ) {
    throw criarErroTextoOcrMuitoLongo()
  }

  const resultado = await salvarRascunhoOcr({
    temaId,
    alunoId,
    texto: resultadoOcr.texto,
  })

  return tratarResultadoDaEscrita(resultado)
}

export async function enviarRedacaoParaAluno({
  temaId,
  alunoId,
}) {
  const resultado = await enviarRedacaoDoAluno({
    temaId,
    alunoId,
    enviadaEm: new Date(),
  })

  return tratarResultadoDaEscrita(resultado)
}

export function listarRedacoesParaAluno(alunoId) {
  return listarRedacoesDoAluno(alunoId)
}

export async function obterRedacaoParaAluno({
  redacaoId,
  alunoId,
}) {
  const redacao = await buscarRedacaoDoAluno({
    redacaoId,
    alunoId,
  })

  if (!redacao) {
    throw criarErroRedacaoNaoEncontrada()
  }

  return redacao
}

export async function listarRedacoesParaProfessor({
  turmaId,
  professorId,
  temaId,
  status,
}) {
  const turma = await buscarTurmaDoProfessor({
    turmaId,
    professorId,
  })

  if (!turma) {
    throw criarErroTurmaNaoEncontrada()
  }

  return listarRedacoesDaTurmaDoProfessor({
    turmaId,
    professorId,
    temaId,
    status,
  })
}

export async function obterRedacaoParaProfessor({
  redacaoId,
  professorId,
}) {
  const redacao = await buscarRedacaoDoProfessor({
    redacaoId,
    professorId,
  })

  if (!redacao) {
    throw criarErroRedacaoNaoEncontrada()
  }

  return redacao
}