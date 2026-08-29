import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  EVENTO_SESSAO_EXPIRADA,
  notificarSessaoExpirada,
  notificarSessaoRestaurada,
} from '../src/services/session-events.js'

test('notifica uma única expiração até a sessão ser restaurada', () => {
  let notificacoes = 0
  const listener = () => {
    notificacoes += 1
  }

  globalThis.addEventListener(
    EVENTO_SESSAO_EXPIRADA,
    listener,
  )

  try {
    notificarSessaoRestaurada()
    notificarSessaoExpirada()
    notificarSessaoExpirada()

    assert.equal(notificacoes, 1)

    notificarSessaoRestaurada()
    notificarSessaoExpirada()

    assert.equal(notificacoes, 2)
  } finally {
    notificarSessaoRestaurada()
    globalThis.removeEventListener(
      EVENTO_SESSAO_EXPIRADA,
      listener,
    )
  }
})
