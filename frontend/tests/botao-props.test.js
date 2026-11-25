import test from 'node:test'
import assert from 'node:assert/strict'
import { resolverPropsBotao } from '../src/utils/botao-props.js'

const evento = () => {
  const chamadas = []
  return {
    chamadas,
    preventDefault: () => chamadas.push('preventDefault'),
    stopPropagation: () => chamadas.push('stopPropagation'),
  }
}

test('botão nativo desabilitado usa disabled e type button por padrão', () => {
  const props = resolverPropsBotao({ nativo: true, desabilitado: true })

  assert.equal(props.disabled, true)
  assert.equal(props.type, 'button')
})

test('botão nativo carregando fica desabilitado; normal não', () => {
  assert.equal(resolverPropsBotao({ nativo: true, carregando: true }).disabled, true)
  assert.equal(resolverPropsBotao({ nativo: true, type: 'submit' }).disabled, false)
  assert.equal(resolverPropsBotao({ nativo: true, type: 'submit' }).type, 'submit')
})

test('link desabilitado: sem href nem to, fora do Tab e clique bloqueado', () => {
  let original = 0
  const props = resolverPropsBotao({
    nativo: false,
    desabilitado: true,
    onClick: () => { original += 1 },
    resto: { href: '/x', to: '/y', 'data-teste': 'a' },
  })
  const e = evento()

  props.onClick(e)

  assert.equal('href' in props, false)
  assert.equal('to' in props, false)
  assert.equal(props.tabIndex, -1)
  assert.equal(props['aria-disabled'], true)
  assert.equal(props['data-teste'], 'a')
  assert.deepEqual(e.chamadas, ['preventDefault', 'stopPropagation'])
  assert.equal(original, 0)
})

test('link carregando também é bloqueado', () => {
  const props = resolverPropsBotao({
    nativo: false,
    carregando: true,
    resto: { href: '/x' },
  })

  assert.equal('href' in props, false)
  assert.equal(props.tabIndex, -1)
})

test('link normal navega e chama o onClick original', () => {
  const onClick = () => {}
  const props = resolverPropsBotao({
    nativo: false,
    onClick,
    resto: { href: '/x', to: '/y' },
  })

  assert.equal(props.href, '/x')
  assert.equal(props.to, '/y')
  assert.equal(props.onClick, onClick)
  assert.equal('tabIndex' in props, false)
  assert.equal('aria-disabled' in props, false)
})
