import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aplicarSugestaoLinguistica,
  calcularProgressoUpload,
  contarLinhas,
  contarPalavras,
  descreverExtensao,
  descreverSugestao,
  encontrarRedacaoPorTema,
  formatarHorario,
  formatarPrazoCurto,
  LIMITE_IMAGEM_REDACAO_BYTES,
  mensagemRevisaoLinguistica,
  validarImagemRedacao,
} from '../src/utils/essay-editor.js'

test('não apresenta serviço desativado ou indisponível como revisão concluída', () => {
  assert.match(mensagemRevisaoLinguistica({ status: 'DESATIVADO', disponivel: false, sugestoes: [] }), /desativada/)
  assert.match(mensagemRevisaoLinguistica({ status: 'INDISPONIVEL', disponivel: false, sugestoes: [] }), /indisponível/)
  assert.equal(mensagemRevisaoLinguistica({ status: 'CONCLUIDO', disponivel: true, sugestoes: [] }), 'Nenhuma sugestão foi encontrada.')
  assert.match(mensagemRevisaoLinguistica({ status: 'CONCLUIDO', disponivel: true, sugestoes: [{}] }), /1 sugestão/)
})

test('encontra a redação do tema sem alterar a coleção', () => {
  const redacoes = [
    { id: 'r1', temaId: 'tema-1' },
    { id: 'r2', temaId: 'tema-2' },
  ]

  assert.equal(
    encontrarRedacaoPorTema(redacoes, 'tema-2'),
    redacoes[1],
  )
  assert.equal(
    encontrarRedacaoPorTema(redacoes, 'tema-3'),
    null,
  )
  assert.equal(encontrarRedacaoPorTema(null, 'tema-1'), null)
})

test('valida formato e limite da imagem de redação', () => {
  assert.equal(
    validarImagemRedacao(null),
    'Selecione uma imagem JPEG ou PNG.',
  )
  assert.equal(
    validarImagemRedacao({
      type: 'application/pdf',
      size: 200,
    }),
    'Utilize uma imagem JPEG ou PNG.',
  )
  assert.equal(
    validarImagemRedacao({
      type: 'image/png',
      size: LIMITE_IMAGEM_REDACAO_BYTES + 1,
    }),
    'A imagem deve possuir no máximo 1 MB.',
  )
  assert.equal(
    validarImagemRedacao({
      type: 'image/jpeg',
      size: LIMITE_IMAGEM_REDACAO_BYTES,
    }),
    null,
  )
})

test('calcula progresso de upload dentro do intervalo de 0 a 100', () => {
  assert.equal(calcularProgressoUpload(25, 100), 25)
  assert.equal(calcularProgressoUpload(120, 100), 100)
  assert.equal(calcularProgressoUpload(-5, 100), 0)
  assert.equal(calcularProgressoUpload(1, 0), null)
  assert.equal(calcularProgressoUpload(1, undefined), null)
})

test('aplica sugestão somente quando os offsets ainda correspondem ao texto', () => {
  const sugestao = {
    inicio: 8,
    fim: 11,
    trecho: 'vim',
  }

  assert.equal(
    aplicarSugestaoLinguistica(
      'Ele vai vim amanhã.',
      sugestao,
      'vir',
    ),
    'Ele vai vir amanhã.',
  )
  assert.equal(
    aplicarSugestaoLinguistica(
      'O texto já mudou.',
      sugestao,
      'vir',
    ),
    null,
  )
})

test('conta palavras e linhas não vazias do texto', () => {
  const texto =
    'Primeiro parágrafo da redação.\n\n  Segundo   parágrafo.\n'

  assert.equal(contarPalavras(texto), 6)
  assert.equal(contarLinhas(texto), 2)
  assert.equal(contarPalavras('   '), 0)
  assert.equal(contarLinhas(''), 0)
  assert.equal(
    descreverExtensao(texto),
    '6 palavras · 2 linhas',
  )
  assert.equal(
    descreverExtensao('Uma'),
    '1 palavra · 1 linha',
  )
})

test('formata o horário do salvamento e o prazo curto', () => {
  const data = new Date(2026, 7, 10, 9, 5).toISOString()

  assert.equal(formatarHorario(data), '09:05')
  assert.equal(formatarHorario(null), null)
  assert.equal(
    formatarPrazoCurto(
      new Date(2026, 7, 10, 23, 59).toISOString(),
    ),
    '10/08, 23h59',
  )
  assert.equal(
    formatarPrazoCurto('inválido'),
    'Prazo indisponível',
  )
})

test('descreve a sugestão com o trecho, a categoria e o tom', () => {
  assert.deepEqual(
    descreverSugestao({
      trecho: 'exerçe',
      substituicoes: ['exerce', 'exerceu'],
      mensagem: 'Possível erro de ortografia.',
      regra: {
        id: 'MORFOLOGIK_RULE_PT_BR',
        categoria: 'Erros ortográficos',
      },
    }),
    {
      texto: '“exerçe” → exerce',
      categoria: 'Erros ortográficos',
      tom: 'erro',
    },
  )
  assert.deepEqual(
    descreverSugestao({
      trecho: 'que',
      substituicoes: [],
      mensagemCurta: 'Vírgula antes de “que” explicativo',
      mensagem: 'Mensagem longa.',
      regra: {
        id: 'VIRGULA_QUE',
        categoria: 'Pontuação',
      },
    }),
    {
      texto: 'Vírgula antes de “que” explicativo',
      categoria: 'Pontuação',
      tom: 'atencao',
    },
  )
  assert.equal(
    descreverSugestao({
      trecho: 'nao',
      substituicoes: ['não'],
      regra: {
        id: 'PT_ACENTUACAO',
        categoria: 'Erro de Escrita',
      },
    }).tom,
    'erro',
  )
  assert.equal(
    descreverSugestao({
      trecho: 'acesso a',
      substituicoes: ['acesso à'],
      regra: {
        id: 'CRASE',
        categoria: 'Gramática Geral',
      },
    }).tom,
    'atencao',
  )
  assert.equal(
    descreverSugestao({}).categoria,
    'Revisão linguística',
  )
})
