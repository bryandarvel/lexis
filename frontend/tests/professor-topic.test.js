import test from 'node:test'
import assert from 'node:assert/strict'
import { agruparCriteriosProposta, prepararCriterioPersonalizado, obterPublicacaoFeedback, resumirEntregasProposta } from '../src/utils/professor-topic.js'

const modelo = { criterios: ['Legitimação', 'Pertinência', 'Uso produtivo'].map((nome) => ({ nome, descricao: `Descrição de ${nome}` })) }
const base = modelo.criterios.map((criterio, ordem) => ({ ...criterio, id: `base-${ordem}`, ordem }))
const custom = { nome: 'Atualidade da fonte', descricao: 'Verifica a atualidade da fonte utilizada.' }

test('separa os três critérios fixos sem depender da ordem e sem mutar os dados', () => {
  const originais = [custom, ...base].reverse()
  const copia = structuredClone(originais)
  const grupo = agruparCriteriosProposta(originais, modelo)
  assert.deepEqual(grupo.base.map((item) => item.nome), modelo.criterios.map((item) => item.nome))
  assert.deepEqual(grupo.personalizados, [custom])
  assert.equal(grupo.compativel, true)
  assert.deepEqual(originais, copia)
})

test('adiciona até dois personalizados e conserva o conteúdo e a ordem da base', () => {
  const um = prepararCriterioPersonalizado(base, modelo, null, custom)
  const dois = prepararCriterioPersonalizado(um.criterios, modelo, null, { nome: 'Diversidade', descricao: 'Verifica a diversidade de referências.' })
  assert.deepEqual(dois.criterios.slice(0, 3), modelo.criterios)
  assert.equal(dois.criterios.length, 5)
  assert.match(prepararCriterioPersonalizado(dois.criterios, modelo, null, custom).erro, /dois critérios/)
})

test('editar um personalizado mantém intactos os fixos e o outro personalizado', () => {
  const criterios = [...base, custom, { nome: 'Diversidade', descricao: 'Verifica referências diversas.' }]
  const resultado = prepararCriterioPersonalizado(criterios, modelo, 0, { nome: ' Atualidade  revisada ', descricao: 'Nova descrição da atualidade.' })
  assert.equal(resultado.criterios[3].nome, 'Atualidade revisada')
  assert.deepEqual(resultado.criterios.slice(0, 3), modelo.criterios)
  assert.deepEqual(resultado.criterios[4], criterios[4])
})

test('não permite nome duplicado com um critério fixo nem descrição incompleta', () => {
  assert.match(prepararCriterioPersonalizado(base, modelo, null, { ...custom, nome: ' pertinência ' }).erro, /repetidos/)
  assert.match(prepararCriterioPersonalizado(base, modelo, null, { ...custom, descricao: 'x' }).erro, /Preencha/)
  assert.match(prepararCriterioPersonalizado(base, modelo, null, { ...custom, nome: 'a'.repeat(121) }).erro, /120/)
})

test('preserva propostas legadas com base ausente ou mais de dois extras', () => {
  const legado = [...base.slice(1), custom]
  assert.equal(agruparCriteriosProposta(legado, modelo).compativel, false)
  assert.match(prepararCriterioPersonalizado(legado, modelo, null, custom).erro, /anterior/)
  const excesso = [...base, custom, { nome: 'Segundo', descricao: 'Descrição.' }, { nome: 'Terceiro', descricao: 'Descrição.' }]
  assert.equal(agruparCriteriosProposta(excesso, modelo).personalizados.length, 3)
  assert.match(prepararCriterioPersonalizado(excesso, modelo, 0, custom).erro, /anterior/)
})

test('o modal prepara somente nome e descrição, sem peso nem aprovação simulada', () => {
  const resultado = prepararCriterioPersonalizado(base, modelo, null, { ...custom, peso: 40, aprovado: true })
  assert.deepEqual(resultado.criterios[3], custom)
  assert.deepEqual(resultado.criterios.slice(0, 3), modelo.criterios)
})

test('rejeita edição indisponível e texto vazio sem modificar critérios existentes', () => {
  const criterios = [...base, custom]
  const copia = structuredClone(criterios)
  for (const indice of [-1, 1, undefined]) {
    assert.match(prepararCriterioPersonalizado(criterios, modelo, indice, custom).erro, /não está disponível/)
  }
  assert.match(prepararCriterioPersonalizado(criterios, modelo, 0, { nome: '  ', descricao: '    ' }).erro, /Preencha/)
  assert.deepEqual(criterios, copia)
})

test('a nota vem somente da versão publicada, nunca de um rascunho ou substituída', () => {
  const publicada = { numero: 2, status: 'PUBLICADA', nota: 850 }
  assert.deepEqual(obterPublicacaoFeedback({ historico: [{ numero: 3, status: 'RASCUNHO', nota: 900 }, publicada, { numero: 1, status: 'SUBSTITUIDA', nota: 700 }] }), publicada)
  assert.equal(obterPublicacaoFeedback(null), null)
  assert.equal(obterPublicacaoFeedback({ historico: [{ status: 'RASCUNHO' }] }), null)
})

test('conta entregas por aluno e exclui rascunhos não enviados', () => {
  const resumo = resumirEntregasProposta([
    { id: '1', aluno: { id: 'a' }, status: 'ENVIADA' },
    { id: '2', aluno: { id: 'a' }, status: 'AVALIADA' },
    { id: '3', aluno: { id: 'b' }, status: 'RASCUNHO' },
  ])
  assert.equal(resumo.alunos, 1)
  assert.equal(resumo.redacoes.length, 2)
})
