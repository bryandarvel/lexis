import test from 'node:test'
import assert from 'node:assert/strict'
import { agruparCriteriosProposta, prepararCriterioPersonalizado, obterPublicacaoFeedback, resumirEntregasProposta, descreverEdicaoTema, formatarPrazoParaInput, prepararEdicaoTema } from '../src/utils/professor-topic.js'

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

const temaBase = {
  ativo: true,
  criteriosBloqueados: false,
  enunciado: 'Desafios da inclusao digital',
  descricao: 'Produza um texto dissertativo-argumentativo sobre o tema.',
  instrucoes: null,
  prazoEntrega: '2027-01-10T23:59:00.000Z',
}
const AGORA = new Date('2026-11-01T12:00:00.000Z').getTime()
const formularioDe = (tema, mudancas = {}) => ({
  enunciado: tema.enunciado,
  descricao: tema.descricao,
  instrucoes: tema.instrucoes ?? '',
  prazoEntrega: formatarPrazoParaInput(tema.prazoEntrega),
  ...mudancas,
})

test('edicao da proposta envia apenas os campos alterados', () => {
  const { erros, dados } = prepararEdicaoTema(
    formularioDe(temaBase, { enunciado: '  Novo   enunciado da proposta  ' }), temaBase, AGORA,
  )
  assert.deepEqual(erros, {})
  assert.deepEqual(dados, { enunciado: 'Novo enunciado da proposta' })
})

test('edicao sem nenhuma mudanca é recusada antes de chamar a API', () => {
  const { erros, dados } = prepararEdicaoTema(formularioDe(temaBase), temaBase, AGORA)
  assert.equal(dados, null)
  assert.ok(erros.formulario)
})

test('edicao valida cada campo pelos limites do backend', () => {
  const { erros } = prepararEdicaoTema(
    formularioDe(temaBase, { enunciado: 'abc', descricao: 'curta', instrucoes: 'x'.repeat(5001) }),
    temaBase, AGORA,
  )
  assert.ok(erros.enunciado)
  assert.ok(erros.descricao)
  assert.ok(erros.instrucoes)
  assert.equal(erros.prazoEntrega, undefined)
})

test('prazo precisa ser futuro e valido', () => {
  assert.ok(prepararEdicaoTema(formularioDe(temaBase, { prazoEntrega: '2026-01-01T10:00' }), temaBase, AGORA).erros.prazoEntrega)
  assert.ok(prepararEdicaoTema(formularioDe(temaBase, { prazoEntrega: 'nao-e-data' }), temaBase, AGORA).erros.prazoEntrega)
})

test('proposta com prazo vencido aceita editar só a descrição, sem enviar o prazo', () => {
  const vencida = { ...temaBase, prazoEntrega: '2020-01-02T10:30:45.000Z' }
  const { erros, dados } = prepararEdicaoTema(
    formularioDe(vencida, { descricao: 'Nova descricao do tema, ainda dissertativa.' }), vencida, AGORA,
  )
  assert.deepEqual(erros, {})
  assert.deepEqual(dados, { descricao: 'Nova descricao do tema, ainda dissertativa.' })
  assert.equal('prazoEntrega' in dados, false)
})

test('prazo alterado para o passado é rejeitado mesmo em proposta com prazo vencido', () => {
  const vencida = { ...temaBase, prazoEntrega: '2020-01-02T10:30:45.000Z' }
  const { erros, dados } = prepararEdicaoTema(
    formularioDe(vencida, { prazoEntrega: '2021-05-05T08:00' }), vencida, AGORA,
  )
  assert.equal(dados, null)
  assert.match(erros.prazoEntrega, /futuro/)
})

test('prazo não editado não vai no payload e preserva os segundos originais', () => {
  const comSegundos = { ...temaBase, prazoEntrega: '2027-01-10T23:59:45.000Z' }
  const { erros, dados } = prepararEdicaoTema(
    formularioDe(comSegundos, { enunciado: 'Enunciado revisado da proposta' }), comSegundos, AGORA,
  )
  assert.deepEqual(erros, {})
  assert.deepEqual(dados, { enunciado: 'Enunciado revisado da proposta' })
  // Só o prazo igual, sem outra mudança: nada a salvar (não reenvia o prazo truncado).
  const semMudanca = prepararEdicaoTema(formularioDe(comSegundos), comSegundos, AGORA)
  assert.equal(semMudanca.dados, null)
  assert.ok(semMudanca.erros.formulario)
})

test('prazo alterado para o futuro vai no payload em ISO', () => {
  const { erros, dados } = prepararEdicaoTema(
    formularioDe(temaBase, { prazoEntrega: '2027-03-01T18:00' }), temaBase, AGORA,
  )
  assert.deepEqual(erros, {})
  assert.deepEqual(Object.keys(dados), ['prazoEntrega'])
  assert.equal(dados.prazoEntrega, new Date('2027-03-01T18:00').toISOString())
})

test('com redacoes enviadas, so o prazo pode mudar', () => {
  const bloqueado = { ...temaBase, criteriosBloqueados: true }
  const conteudo = prepararEdicaoTema(formularioDe(bloqueado, { descricao: 'Outra descricao bem mais longa.' }), bloqueado, AGORA)
  assert.equal(conteudo.dados, null)
  assert.ok(conteudo.erros.descricao)

  const prazo = prepararEdicaoTema(formularioDe(bloqueado, { prazoEntrega: '2027-02-01T23:59' }), bloqueado, AGORA)
  assert.deepEqual(prazo.erros, {})
  assert.deepEqual(Object.keys(prazo.dados), ['prazoEntrega'])
})

test('orientacoes vazias viram null, como o contrato espera', () => {
  const comInstrucoes = { ...temaBase, instrucoes: 'Leia os textos motivadores.' }
  const { dados } = prepararEdicaoTema(formularioDe(comInstrucoes, { instrucoes: '   ' }), comInstrucoes, AGORA)
  assert.deepEqual(dados, { instrucoes: null })
})

test('descreve o bloqueio da proposta conforme o estado', () => {
  assert.deepEqual(descreverEdicaoTema(temaBase), { podeEditar: true, conteudoBloqueado: false, motivo: '' })
  assert.equal(descreverEdicaoTema({ ...temaBase, criteriosBloqueados: true }).conteudoBloqueado, true)
  assert.equal(descreverEdicaoTema({ ...temaBase, ativo: false }).podeEditar, false)
  assert.equal(descreverEdicaoTema(null).podeEditar, false)
})

test('prazo é formatado para o input e tolera valor invalido', () => {
  assert.match(formatarPrazoParaInput('2027-01-10T23:59:00.000Z'), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  assert.equal(formatarPrazoParaInput(null), '')
  assert.equal(formatarPrazoParaInput('nao-e-data'), '')
})
