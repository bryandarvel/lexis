// Perfil do aluno (somente leitura): conta, turma e desempenho.
//
// GET /api/aluno/desempenho não filtra por turma nem por matrícula: soma tudo o
// que o aluno tem, inclusive redações de turmas que ele já deixou. As médias e
// a última nota vêm das versões PUBLICADAS dos feedbacks (no máximo uma por
// redação); totalEnviadas conta redações ENVIADA ou AVALIADA de qualquer turma.
// Os rótulos abaixo dizem exatamente isso, sem sugerir evolução.

import { descreverMatricula } from './minha-turma.js'

export const NOTA_DESEMPENHO =
  'Considera todas as suas turmas, inclusive as que você já deixou. Médias e última nota usam apenas correções publicadas.'

const ROTULOS_PAPEL = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
}

export function rotularPapel(papel) {
  return ROTULOS_PAPEL[papel] ?? 'Não informado'
}

export function formatarMembroDesde(valor) {
  const data = valor ? new Date(valor) : null

  if (!data || Number.isNaN(data.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(data)
}

export function descreverConta(usuario) {
  if (!usuario) {
    return null
  }

  return {
    nome: usuario.nome?.trim() || 'Não informado',
    email: usuario.email?.trim() || 'Não informado',
    papel: rotularPapel(usuario.papel),
    membroDesde: formatarMembroDesde(usuario.criadoEm),
  }
}

export function descreverTurma(matricula) {
  return descreverMatricula(matricula)
}

// O backend devolve médias com até uma casa decimal.
export function formatarNota(valor) {
  return Number.isFinite(valor)
    ? valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    : null
}

function formatarContagem(valor) {
  return Number.isInteger(valor) && valor >= 0
    ? valor.toLocaleString('pt-BR')
    : null
}

export function resumirDesempenho(desempenho) {
  const mediaGeral = formatarNota(desempenho?.mediaGeral)
  const ultimaNota = formatarNota(desempenho?.ultimaNota)
  const corrigidas = desempenho?.totalCorrigidas ?? 0

  return {
    semCorrecao: corrigidas === 0,
    itens: [
      {
        rotulo: 'Média das notas publicadas',
        valor: mediaGeral,
        unidade: mediaGeral === null ? null : '/ 1000',
      },
      {
        rotulo: 'Última nota publicada',
        valor: ultimaNota,
        unidade: ultimaNota === null ? null : '/ 1000',
      },
      {
        rotulo: 'Redações enviadas',
        valor: formatarContagem(desempenho?.totalEnviadas),
        unidade: null,
      },
      {
        rotulo: 'Redações corrigidas',
        valor: formatarContagem(desempenho?.totalCorrigidas),
        unidade: null,
      },
    ],
  }
}

// Converte o resultado de Promise.allSettled em um estado de bloco. Quando a
// rejeição é "sem turma" (ou outra tratada em semDados), vira estado próprio
// em vez de erro.
export function resolverBloco(resultado, { aceitarRejeicao } = {}) {
  if (resultado?.status === 'fulfilled') {
    return { status: 'pronto', dados: resultado.value }
  }

  const tratado = aceitarRejeicao?.(resultado?.reason)

  if (tratado) {
    return tratado
  }

  return { status: 'erro', dados: null }
}
