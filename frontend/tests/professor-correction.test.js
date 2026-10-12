import test from 'node:test'
import assert from 'node:assert/strict'
import { criarFormularioFeedback, montarDadosFeedback, validarFeedback, sugestaoDoCriterio, criterioFixo, tomCriterio, evidenciasVerificadas, organizarFila, comentarioEditavel, atualizarComentario } from '../src/utils/professor-correction.js'

const criterio = { id: 'c1', nome: 'Legitimação', ordem: 1 }
const redacao = { tema: { criterios: [criterio] } }
const completo = { competencia1: 160, competencia2: 180, competencia3: 140, competencia4: 160, competencia5: 180, comentarioGeral: 'Comentário humano.', criterios: [] }

test('o formulário mantém notas vazias sem atribuir zero ou importar nota de IA', () => {
  const form = criarFormularioFeedback(redacao, null)
  assert.equal(form.competencia2, '')
  assert.deepEqual(form.criterionComments, { c1: '' })
  assert.equal(montarDadosFeedback(form).competencia2, null)
  assert.equal(validarFeedback(montarDadosFeedback(form)), '')
  assert.match(validarFeedback(montarDadosFeedback(form), true), /cinco competências/)
})

test('notas e comentários vêm da versão humana atual e preservam nota legada', () => {
  const form = criarFormularioFeedback(redacao, { versaoAtual: { nota: 850, comentarioGeral: 'Feedback salvo', criterios: [{ criterioId: 'c1', comentario: 'Humano' }] } })
  assert.equal(form.legacyScore, '850')
  assert.equal(form.competencia1, '')
  assert.equal(form.criterionComments.c1, 'Humano')
})

test('o payload contém somente campos do contrato e comentários não vazios', () => {
  const form = { ...criarFormularioFeedback(redacao, null), competencia1: ' 0 ', generalComment: '  ', criterionComments: { c1: '  comentário  ', c2: '' }, peso: 40 }
  const dados = montarDadosFeedback(form)
  assert.equal(dados.competencia1, 0)
  assert.equal(dados.comentarioGeral, null)
  assert.deepEqual(dados.criterios, [{ criterioId: 'c1', comentario: 'comentário' }])
  assert.equal('peso' in dados, false)
  assert.equal('legacyScore' in dados, false)
})

test('publicação exige cinco notas válidas e comentário geral', () => {
  assert.equal(validarFeedback(completo, true), '')
  for (const nota of [-1, 201, 10.5, NaN, Infinity]) assert.match(validarFeedback({ ...completo, competencia2: nota }, true), /inteira/)
  assert.match(validarFeedback({ ...completo, competencia5: null }, true), /cinco/)
  assert.match(validarFeedback({ ...completo, comentarioGeral: null }, true), /comentário geral/)
  assert.match(validarFeedback({ ...completo, criterios: [{ comentario: 'x'.repeat(5001) }] }), /limites/)
})

test('sugestão consultiva só corresponde quando nome, ordem e conclusão coincidem', () => {
  const sugestao = { ordem: 1, criterio: 'Legitimação', diagnostico: 'Texto consultivo.' }
  const analise = { status: 'CONCLUIDA', resultadoEstruturado: { analisePorCriterio: [sugestao] } }
  assert.deepEqual(sugestaoDoCriterio(analise, criterio), sugestao)
  assert.equal(sugestaoDoCriterio({ ...analise, status: 'ERRO' }, criterio), null)
  assert.equal(sugestaoDoCriterio(analise, { ...criterio, nome: 'Outro' }), null)
  assert.equal(sugestaoDoCriterio(analise, { ...criterio, ordem: 2 }), null)
})

test('os três fixos mantêm cores estáveis sem depender da ordem', () => {
  assert.equal(criterioFixo({ nome: ' Pertinência ' }), true)
  assert.equal(criterioFixo({ nome: 'Diversidade' }), false)
  assert.equal(tomCriterio({ nome: 'Uso produtivo' }, 0), 2)
  assert.equal(tomCriterio({ nome: 'Diversidade' }, 3), 3)
  assert.equal(tomCriterio({ nome: 'Atualidade' }, 4), 4)
})

test('exibe sugestão editável sem incorporá-la automaticamente ao feedback humano', () => {
  const form = criarFormularioFeedback(redacao, null)
  const analise = { status: 'CONCLUIDA', resultadoEstruturado: { analisePorCriterio: [{ ordem: 1, criterio: 'Legitimação', diagnostico: 'Sugestão consultiva.' }] } }
  assert.deepEqual(comentarioEditavel(form, analise, criterio), { texto: 'Sugestão consultiva.', sugerido: true })
  assert.deepEqual(montarDadosFeedback(form).criterios, [])
  const editado = atualizarComentario(form, 'c1', 'Texto reescrito pelo professor.')
  assert.deepEqual(comentarioEditavel(editado, analise, criterio), { texto: 'Texto reescrito pelo professor.', sugerido: false })
  assert.deepEqual(montarDadosFeedback(editado).criterios, [{ criterioId: 'c1', comentario: 'Texto reescrito pelo professor.' }])
  assert.equal('criterionReviewed' in montarDadosFeedback(editado), false)
  assert.equal(form.criterionComments.c1, '')
})

test('apagar ou descartar uma sugestão mantém o campo vazio inclusive no rascunho recuperado', () => {
  const analise = { status: 'CONCLUIDA', resultadoEstruturado: { analisePorCriterio: [{ ordem: 1, criterio: 'Legitimação', diagnostico: 'Sugestão consultiva.' }] } }
  const vazio = atualizarComentario(criarFormularioFeedback(redacao, null), 'c1', '')
  assert.deepEqual(comentarioEditavel(vazio, analise, criterio), { texto: '', sugerido: false })
  const recuperado = JSON.parse(JSON.stringify(vazio))
  assert.deepEqual(comentarioEditavel(recuperado, analise, criterio), { texto: '', sugerido: false })
  assert.deepEqual(montarDadosFeedback(recuperado).criterios, [])
})

test('aceitar uma sugestão ou receber outra análise não sobrescreve a decisão humana', () => {
  const analise = { status: 'CONCLUIDA', resultadoEstruturado: { analisePorCriterio: [{ ordem: 1, criterio: 'Legitimação', diagnostico: 'Outra sugestão.' }] } }
  const aceito = atualizarComentario(criarFormularioFeedback(redacao, null), 'c1', 'Sugestão revisada.')
  assert.deepEqual(comentarioEditavel(aceito, analise, criterio), { texto: 'Sugestão revisada.', sugerido: false })
  const apagado = atualizarComentario(aceito, 'c1', '')
  assert.deepEqual(comentarioEditavel(apagado, analise, criterio), { texto: '', sugerido: false })
})

test('marcações e lista usam somente trechos reais e não duplicam evidências sobrepostas', () => {
  const evidencia = { trecho: 'fonte', inicio: 2, fim: 7, statusLocalizacao: 'LOCALIZADA' }
  const analise = { status: 'CONCLUIDA', resultadoEstruturado: { analisePorCriterio: [
    { ordem: 1, evidencias: [evidencia, { ...evidencia, trecho: 'inventado' }] },
    { ordem: 2, evidencias: [evidencia, { trecho: 'x', inicio: -1, fim: 0, statusLocalizacao: 'LOCALIZADA' }] },
  ] } }
  const resultado = evidenciasVerificadas('A fonte citada.', analise)
  assert.equal(resultado.trechos.length, 1)
  assert.deepEqual(resultado.trechos[0].ordens, [1, 2])
  assert.equal(resultado.segmentos.map((s) => s.texto).join(''), 'A fonte citada.')
  assert.equal(evidenciasVerificadas('A fonte citada.', { ...analise, status: 'ERRO' }).trechos.length, 0)
})

test('a fila exclui rascunhos e Pular procura outra redação enviada sem mutar a lista', () => {
  const lista = [{ id: 'c', enviadaEm: '2026-10-03', status: 'AVALIADA' }, { id: 'b', enviadaEm: '2026-10-02', status: 'ENVIADA' }, { id: 'a', enviadaEm: '2026-10-01', status: 'ENVIADA' }, { id: 'd', status: 'RASCUNHO' }]
  const copia = structuredClone(lista)
  const fila = organizarFila(lista, 'b')
  assert.equal(fila.posicao, 2)
  assert.equal(fila.total, 3)
  assert.equal(fila.proxima.id, 'a')
  assert.deepEqual(lista, copia)
  assert.equal(organizarFila([lista[1]], 'b').proxima, null)
  assert.equal(organizarFila(lista, 'inexistente').posicao, null)
})
