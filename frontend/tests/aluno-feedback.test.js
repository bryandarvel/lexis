import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  classificarCarregamentoFeedback,
  descreverFeedbackIndisponivel,
  descreverOrigemFeedback,
  descreverVersaoFeedback,
  listarNotasCompetencias,
  obterRotaEnviarRedacao,
  obterTomCriterio,
  organizarCriteriosComentados,
  possuiNotasCompetencias,
  selecionarNotificacoesNaoLidasDaRedacao,
  TOTAL_TONS_CRITERIO,
} from '../src/utils/aluno-feedback.js'

function criarComentario(id, nome, ordem, comentario = `Comentário de ${nome}.`) {
  return {
    id,
    criterioId: `criterio-${id}`,
    comentario,
    criterio: { nome, descricao: '', ordem },
  }
}

function falhaHttp(status) {
  return {
    status: 'rejected',
    reason: { response: { status } },
  }
}

test('a cor do critério vem da ordem, recomeça a paleta e usa tom neutro sem ordem válida', () => {
  assert.equal(TOTAL_TONS_CRITERIO, 5)
  assert.equal(obterTomCriterio(1), '0')
  assert.equal(obterTomCriterio(5), '4')
  assert.equal(obterTomCriterio(6), '0')
  assert.equal(obterTomCriterio(12), '1')
  assert.equal(obterTomCriterio(0), 'neutro')
  assert.equal(obterTomCriterio(null), 'neutro')
  assert.equal(obterTomCriterio(2.5), 'neutro')
})

test('organiza N critérios comentados pela ordem, sem depender da ordem recebida', () => {
  const criterios = organizarCriteriosComentados([
    criarComentario('c4', 'Diversidade de áreas', 4),
    criarComentario('c1', 'Legitimação', 1),
    criarComentario('c3', 'Uso produtivo', 3),
    criarComentario('c2', 'Pertinência', 2),
    criarComentario('c7', 'Critério extra', 7),
  ])

  assert.deepEqual(
    criterios.map(({ nome, tom }) => [nome, tom]),
    [
      ['Legitimação', '0'],
      ['Pertinência', '1'],
      ['Uso produtivo', '2'],
      ['Diversidade de áreas', '3'],
      ['Critério extra', '1'],
    ],
  )
})

test('a cor de um critério não muda quando os anteriores ficam sem comentário', () => {
  const [criterio] = organizarCriteriosComentados([
    criarComentario('c3', 'Uso produtivo', 3),
  ])

  assert.equal(criterio.tom, '2')
})

test('descarta comentários vazios e tolera critério sem ordem ou sem nome', () => {
  const criterios = organizarCriteriosComentados([
    criarComentario('vazio', 'Pertinência', 2, '   '),
    { id: 'sem-ordem', comentario: ' Texto ', criterio: { nome: 'Sem ordem' } },
    { id: 'sem-nome', comentario: 'Outro', criterio: { ordem: 1 } },
  ])

  assert.deepEqual(
    criterios.map(({ id, nome, comentario, tom }) => [id, nome, comentario, tom]),
    [
      ['sem-nome', 'Critério', 'Outro', '0'],
      ['sem-ordem', 'Sem ordem', 'Texto', 'neutro'],
    ],
  )
  assert.deepEqual(organizarCriteriosComentados(null), [])
  assert.deepEqual(organizarCriteriosComentados([]), [])
})

test('lista as cinco competências com percentual sobre 200 e destaca a II', () => {
  const competencias = listarNotasCompetencias({
    competencia1: 160,
    competencia2: 200,
    competencia3: 140,
    competencia4: 0,
    competencia5: 160,
  })

  assert.deepEqual(
    competencias.map(({ numero, nota, percentual, destaque }) => [numero, nota, percentual, destaque]),
    [
      ['I', 160, 80, false],
      ['II', 200, 100, true],
      ['III', 140, 70, false],
      ['IV', 0, 0, false],
      ['V', 160, 80, false],
    ],
  )
  assert.match(competencias[0].titulo, /^Domínio da modalidade escrita formal/)
  assert.equal(possuiNotasCompetencias(competencias), true)
})

test('correção legada só com nota total não inventa notas por competência', () => {
  const competencias = listarNotasCompetencias({
    nota: 720,
    competencia1: null,
  })

  assert.ok(competencias.every(({ nota, percentual }) => nota === null && percentual === 0))
  assert.equal(possuiNotasCompetencias(competencias), false)
})

test('a versão maior que 1 indica correção atualizada', () => {
  assert.deepEqual(descreverVersaoFeedback({ numero: 1 }), {
    rotulo: 'Versão 1 · publicada',
    atualizada: false,
  })
  assert.deepEqual(descreverVersaoFeedback({ numero: 3 }), {
    rotulo: 'Versão 3 · publicada',
    atualizada: true,
  })
  assert.deepEqual(descreverVersaoFeedback({}), {
    rotulo: 'Versão publicada',
    atualizada: false,
  })
})

test('o subtítulo usa tema, datas e o nome do professor, sem prefixo de tratamento', () => {
  const redacao = {
    enviadaEm: new Date(2026, 7, 2, 10, 0).toISOString(),
    tema: {
      enunciado: ' Desafios para a inclusão digital no Brasil ',
      turma: { professor: { nome: 'Ana Lima' } },
    },
  }
  const feedback = {
    publicadoEm: new Date(2026, 7, 3, 18, 30).toISOString(),
  }

  assert.deepEqual(descreverOrigemFeedback({ redacao, feedback }), [
    'Desafios para a inclusão digital no Brasil',
    'enviada em 02/08',
    'publicada em 03/08 por Ana Lima',
  ])
  assert.deepEqual(
    descreverOrigemFeedback({
      redacao: { tema: { enunciado: 'Tema' } },
      feedback: { publicadoEm: 'inválida' },
    }),
    ['Tema'],
  )
  assert.deepEqual(
    descreverOrigemFeedback({
      redacao: { tema: { enunciado: 'Tema', turma: {} } },
      feedback,
    }),
    ['Tema', 'publicada em 03/08'],
  )
})

test('o item Enviar redação aponta para a primeira proposta que aceita envio', () => {
  const agora = new Date(2026, 7, 4, 10, 0)
  const temas = [
    { id: 'avaliada', enunciado: 'A', prazoEntrega: new Date(2026, 7, 5).toISOString() },
    { id: 'aberta/1', enunciado: 'B', prazoEntrega: new Date(2026, 7, 9).toISOString() },
  ]
  const redacoes = [{ temaId: 'avaliada', status: 'AVALIADA' }]

  assert.equal(
    obterRotaEnviarRedacao(temas, redacoes, agora),
    '/aluno/temas/aberta%2F1/redacao',
  )
  assert.equal(
    obterRotaEnviarRedacao(temas.slice(0, 1), redacoes, agora),
    null,
  )
  assert.equal(obterRotaEnviarRedacao(undefined, undefined, agora), null)
})

test('seleciona só as notificações não lidas desta redação', () => {
  const notificacoes = [
    { id: 'n1', lidaEm: null, feedbackVersao: { feedback: { redacaoId: 'r1' } } },
    { id: 'n2', lidaEm: '2026-08-03T10:00:00.000Z', feedbackVersao: { feedback: { redacaoId: 'r1' } } },
    { id: 'n3', lidaEm: null, feedbackVersao: { feedback: { redacaoId: 'r2' } } },
    { id: 'n4', lidaEm: null, feedbackVersao: { feedback: { redacaoId: 'r1' } } },
    { id: 'n5', lidaEm: null },
  ]

  assert.deepEqual(selecionarNotificacoesNaoLidasDaRedacao(notificacoes, 'r1'), ['n1', 'n4'])
  assert.deepEqual(selecionarNotificacoesNaoLidasDaRedacao(notificacoes, 'r9'), [])
  assert.deepEqual(selecionarNotificacoesNaoLidasDaRedacao(undefined, 'r1'), [])
  assert.deepEqual(selecionarNotificacoesNaoLidasDaRedacao(notificacoes, ''), [])
})

test('distingue redação inexistente, correção não publicada e falha de rede', () => {
  const redacao = { id: 'r1', status: 'ENVIADA' }
  const feedback = { id: 'f1' }

  assert.deepEqual(
    classificarCarregamentoFeedback(
      { status: 'fulfilled', value: redacao },
      { status: 'fulfilled', value: feedback },
    ),
    { status: 'pronto', redacao, feedback },
  )
  assert.deepEqual(
    classificarCarregamentoFeedback(
      { status: 'fulfilled', value: redacao },
      falhaHttp(404),
    ),
    { status: 'nao-publicada', redacao },
  )
  assert.deepEqual(
    classificarCarregamentoFeedback(falhaHttp(404), falhaHttp(404)),
    { status: 'nao-encontrada' },
  )
  assert.deepEqual(
    classificarCarregamentoFeedback(
      { status: 'fulfilled', value: redacao },
      falhaHttp(500),
    ),
    { status: 'erro' },
  )
  assert.deepEqual(
    classificarCarregamentoFeedback(
      { status: 'rejected', reason: new Error('Network Error') },
      { status: 'fulfilled', value: feedback },
    ),
    { status: 'erro' },
  )
})

test('explica a correção indisponível conforme a situação da redação', () => {
  const rascunho = descreverFeedbackIndisponivel({
    status: 'RASCUNHO',
    temaId: 'tema/1',
  })

  assert.equal(rascunho.titulo, 'Esta redação ainda não foi enviada')
  assert.equal(rascunho.acao.destino, '/aluno/temas/tema%2F1/redacao')

  const enviada = descreverFeedbackIndisponivel({ status: 'ENVIADA' })

  assert.equal(enviada.titulo, 'A correção ainda não foi publicada')
  assert.equal(enviada.acao.destino, '/aluno')
})
