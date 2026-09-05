import api from './api.js'
import { calcularProgressoUpload } from '../utils/essay-editor.js'

function prepararId(id) {
  return encodeURIComponent(id)
}

export async function salvarRascunho(
  temaId,
  texto,
) {
  const resposta = await api.put(
    `/api/aluno/temas/${prepararId(
      temaId,
    )}/redacao`,
    {
      texto,
    },
  )

  return resposta.data.data.redacao
}

export async function enviarRedacao(
  temaId,
) {
  const resposta = await api.post(
    `/api/aluno/temas/${prepararId(
      temaId,
    )}/redacao/enviar`,
  )

  return resposta.data.data.redacao
}

export async function listarMinhasRedacoes() {
  const resposta = await api.get(
    '/api/aluno/redacoes',
  )

  return resposta.data.data.redacoes
}

export async function obterMinhaRedacao(
  redacaoId,
) {
  const resposta = await api.get(
    `/api/aluno/redacoes/${prepararId(
      redacaoId,
    )}`,
  )

  return resposta.data.data.redacao
}

export async function listarRedacoesDaTurma(
  turmaId,
  filtros = {},
) {
  const resposta = await api.get(
    `/api/turmas/${prepararId(
      turmaId,
    )}/redacoes`,
    {
      params: {
        temaId: filtros.temaId,
        status: filtros.status,
      },
    },
  )

  return resposta.data.data.redacoes
}

export async function obterRedacaoProfessor(
  redacaoId,
) {
  const resposta = await api.get(
    `/api/redacoes/${prepararId(redacaoId)}`,
  )

  return resposta.data.data.redacao
}

export async function transcreverImagemRedacao(
  temaId,
  imagem,
  onProgress,
) {
  const formulario = new FormData()
  formulario.append('imagem', imagem)

  const resposta = await api.post(
    `/api/aluno/temas/${prepararId(
      temaId,
    )}/redacao/ocr`,
    formulario,
    {
      onUploadProgress(evento) {
        const progresso = calcularProgressoUpload(
          evento.loaded,
          evento.total,
        )

        if (progresso === null || !onProgress) {
          return
        }

        onProgress(progresso)
      },
    },
  )

  return resposta.data.data
}

export async function confirmarRevisaoOcr(
  temaId,
  texto,
) {
  const resposta = await api.put(
    `/api/aluno/temas/${prepararId(
      temaId,
    )}/redacao/ocr/revisao`,
    {
      texto,
    },
  )

  return resposta.data.data.redacao
}

export async function revisarLinguagemRedacao(
  temaId,
  texto,
) {
  const resposta = await api.post(
    `/api/aluno/temas/${prepararId(
      temaId,
    )}/redacao/revisao-linguistica`,
    { texto },
  )

  return resposta.data.data.revisao
}
