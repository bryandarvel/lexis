import assert from 'node:assert/strict'
import test from 'node:test'

import {
  criarCriteriosDoModelo,
  moverCriterio,
  prepararTemaParaEnvio,
  validarCriteriosTema,
  validarFormularioTema,
} from '../src/utils/topic-form.js'

const modelo = {
  criterios: [
    { nome: 'Legitimação', descricao: 'Descrição 1.' },
    { nome: 'Pertinência', descricao: 'Descrição 2.' },
    { nome: 'Uso produtivo', descricao: 'Descrição 3.' },
  ],
}

test('cria uma cópia editável dos critérios do modelo', () => {
  const criterios = criarCriteriosDoModelo(modelo)
  criterios[0].nome = 'Personalizado'

  assert.equal(modelo.criterios[0].nome, 'Legitimação')
  assert.equal(criterios.length, 3)
  assert.ok(criterios.every((item) => item.idLocal))
})

test('reordena critérios sem alterar a coleção de origem', () => {
  const criterios = criarCriteriosDoModelo(modelo)
  const reordenados = moverCriterio(criterios, 0, 1)

  assert.equal(reordenados[0].nome, 'Pertinência')
  assert.equal(criterios[0].nome, 'Legitimação')
  assert.equal(moverCriterio(criterios, 0, -1), criterios)
})

test('remove identificadores locais do contrato enviado à API', () => {
  const formulario = {
    enunciado: 'Tema demonstrável',
    descricao: 'Descrição suficientemente completa.',
    instrucoes: '',
    prazoEntrega: '2030-01-01T12:00',
    criterios: criarCriteriosDoModelo(modelo),
  }
  const dados = prepararTemaParaEnvio(formulario)

  assert.equal(Object.hasOwn(dados.criterios[0], 'idLocal'), false)
  assert.equal(
    dados.prazoEntrega,
    new Date(formulario.prazoEntrega).toISOString(),
  )
})

test('impede critérios repetidos antes do envio', () => {
  const formulario = {
    enunciado: 'Tema demonstrável',
    descricao: 'Descrição suficientemente completa.',
    instrucoes: '',
    prazoEntrega: '2030-01-01T12:00',
    criterios: [
      { nome: 'Pertinência', descricao: 'Descrição 1.' },
      { nome: ' pertinência ', descricao: 'Descrição 2.' },
    ],
  }

  assert.equal(
    validarFormularioTema(formulario),
    'Os critérios não podem possuir nomes repetidos.',
  )
  assert.equal(
    validarCriteriosTema(formulario.criterios),
    'Os critérios não podem possuir nomes repetidos.',
  )
})
