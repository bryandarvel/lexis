import api from './api.js'
import { normalizarCodigoAcesso } from '../utils/class-code.js'

function prepararId(id) {
  return encodeURIComponent(id)
}

export async function criarTurma(nome) {
  const resposta = await api.post('/api/turmas', {
    nome,
  })

  return resposta.data.data.turma
}

export async function listarTurmas() {
  const resposta = await api.get('/api/turmas')

  return resposta.data.data.turmas
}

export async function obterTurma(turmaId) {
  const resposta = await api.get(
    `/api/turmas/${prepararId(turmaId)}`,
  )

  return resposta.data.data.turma
}

export async function renomearTurma(
  turmaId,
  nome,
) {
  const resposta = await api.patch(
    `/api/turmas/${prepararId(turmaId)}`,
    {
      nome,
    },
  )

  return resposta.data.data.turma
}

export async function regenerarCodigoTurma(
  turmaId,
) {
  const resposta = await api.post(
    `/api/turmas/${prepararId(
      turmaId,
    )}/regenerar-codigo`,
  )

  return resposta.data.data.turma
}

export async function arquivarTurma(turmaId) {
  const resposta = await api.post(
    `/api/turmas/${prepararId(turmaId)}/arquivar`,
  )

  return resposta.data.data.turma
}

export async function listarAlunosDaTurma(
  turmaId,
) {
  const resposta = await api.get(
    `/api/turmas/${prepararId(turmaId)}/alunos`,
  )

  return resposta.data.data.matriculas
}

export async function desvincularAlunoDaTurma(
  turmaId,
  alunoId,
) {
  const resposta = await api.delete(
    `/api/turmas/${prepararId(
      turmaId,
    )}/alunos/${prepararId(alunoId)}`,
  )

  return resposta.data.data.matricula
}

export async function entrarEmTurma(codigoAcesso) {
  const resposta = await api.post(
    '/api/turmas/entrar',
    {
      codigoAcesso:
        normalizarCodigoAcesso(codigoAcesso),
    },
  )

  return resposta.data.data.matricula
}

export async function obterMinhaMatricula() {
  const resposta = await api.get(
    '/api/turmas/minha-matricula',
  )

  return resposta.data.data.matricula
}

export async function sairDaTurma() {
  const resposta = await api.delete(
    '/api/turmas/minha-matricula',
  )

  return resposta.data.data.matricula
}
