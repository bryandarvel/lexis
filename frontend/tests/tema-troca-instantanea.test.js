import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

import {
  aplicarTemaNoDocumento,
  CHAVE_TEMA,
  CLASSE_TROCANDO_TEMA,
} from '../src/utils/tema.js'

function criarRaiz() {
  const classes = new Set()

  return {
    dataset: {},
    style: {},
    classes,
    classList: {
      add: (nome) => classes.add(nome),
      remove: (nome) => classes.delete(nome),
    },
  }
}

// Quadros controlados à mão: cada chamada de `avancar` roda um quadro.
function criarRelogioDeQuadros() {
  const fila = []

  return {
    agendarQuadro: (retorno) => fila.push(retorno),
    avancar() {
      fila.splice(0).forEach((retorno) => retorno())
    },
  }
}

test('a troca escreve data-theme e color-scheme na hora', () => {
  const raiz = criarRaiz()

  aplicarTemaNoDocumento(raiz, 'dark')

  assert.equal(raiz.dataset.theme, 'dark')
  assert.equal(raiz.style.colorScheme, 'dark')
  assert.equal(raiz.classes.size, 0)
})

test('suspende as transições de cor na troca e as religa dois quadros depois', () => {
  const raiz = criarRaiz()
  const relogio = criarRelogioDeQuadros()

  aplicarTemaNoDocumento(raiz, 'dark', {
    suspenderTransicoes: true,
    agendarQuadro: relogio.agendarQuadro,
  })

  assert.equal(raiz.dataset.theme, 'dark')
  assert.ok(raiz.classes.has(CLASSE_TROCANDO_TEMA))

  relogio.avancar()
  assert.ok(raiz.classes.has(CLASSE_TROCANDO_TEMA), 'um quadro ainda não basta')

  relogio.avancar()
  assert.equal(raiz.classes.has(CLASSE_TROCANDO_TEMA), false)
})

test('a limpeza do efeito religa as transições e cancela o religamento agendado', () => {
  const raiz = criarRaiz()
  const relogio = criarRelogioDeQuadros()

  const limpar = aplicarTemaNoDocumento(raiz, 'dark', {
    suspenderTransicoes: true,
    agendarQuadro: relogio.agendarQuadro,
  })

  limpar()
  assert.equal(raiz.classes.has(CLASSE_TROCANDO_TEMA), false)

  // Nova troca logo em seguida: o religamento antigo não pode desligá-la.
  aplicarTemaNoDocumento(raiz, 'light', {
    suspenderTransicoes: true,
    agendarQuadro: relogio.agendarQuadro,
  })
  relogio.avancar()
  assert.ok(raiz.classes.has(CLASSE_TROCANDO_TEMA))
})

test('sem requestAnimationFrame o tema muda e nada fica suspenso', () => {
  const raiz = criarRaiz()

  aplicarTemaNoDocumento(raiz, 'dark', {
    suspenderTransicoes: true,
    agendarQuadro: undefined,
  })

  assert.equal(raiz.dataset.theme, 'dark')
  assert.equal(raiz.classes.size, 0)
})

test('cinco trocas seguidas terminam no tema da última', () => {
  const raiz = criarRaiz()
  const relogio = criarRelogioDeQuadros()
  const sequencia = ['dark', 'light', 'dark', 'light', 'dark']
  let limpar = () => {}

  for (const tema of sequencia) {
    limpar()
    limpar = aplicarTemaNoDocumento(raiz, tema, {
      suspenderTransicoes: true,
      agendarQuadro: relogio.agendarQuadro,
    })
  }

  relogio.avancar()
  relogio.avancar()

  assert.equal(raiz.dataset.theme, 'dark')
  assert.equal(raiz.classes.has(CLASSE_TROCANDO_TEMA), false)
})

// REV-010: o script do <head> roda antes do React e evita o quadro claro.
function executarScriptDoHead(armazenamento) {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const [, codigo] = html.match(/<script>([\s\S]*?)<\/script>/)
  const raiz = criarRaiz()
  const contexto = {
    window: { localStorage: armazenamento },
    document: { documentElement: raiz },
  }

  vm.runInNewContext(codigo, contexto)

  return raiz
}

test('o script do head aplica o tema escuro salvo, lendo a mesma chave do app', () => {
  const lidas = []
  const raiz = executarScriptDoHead({
    getItem: (chave) => {
      lidas.push(chave)
      return 'dark'
    },
  })

  assert.deepEqual(lidas, [CHAVE_TEMA])
  assert.equal(raiz.dataset.theme, 'dark')
  assert.equal(raiz.style.colorScheme, 'dark')
})

test('o script do head ignora valor inválido e ausente', () => {
  assert.equal(executarScriptDoHead({ getItem: () => 'azul' }).dataset.theme, undefined)
  assert.equal(executarScriptDoHead({ getItem: () => null }).dataset.theme, undefined)
})

test('o script do head não quebra com o armazenamento bloqueado', () => {
  const raiz = executarScriptDoHead({
    getItem: () => {
      throw new DOMException('fixture', 'SecurityError')
    },
  })

  assert.equal(raiz.dataset.theme, undefined)
})

test('o script do head vem antes do módulo que monta o React', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

  assert.ok(html.indexOf('<script>') < html.indexOf('type="module"'))
  assert.ok(html.indexOf('<script>') < html.indexOf('</head>'))
})
