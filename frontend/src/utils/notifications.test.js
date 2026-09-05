import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  atualizarNotificacaoComoLida,
  obterLinkNotificacao,
} from './notifications.js'

describe('Notificações do aluno', () => {
  it('deve criar um link seguro para o feedback relacionado', () => {
    assert.equal(
      obterLinkNotificacao({
        feedbackVersao: {
          feedback: {
            redacaoId: 'redacao/1',
          },
        },
      }),
      '/aluno/redacoes/redacao%2F1/feedback',
    )
  })

  it('deve atualizar a notificação sem alterar as demais', () => {
    const estado = {
      notificacoes: [
        { id: '1', lidaEm: null },
        { id: '2', lidaEm: null },
      ],
      totalNaoLidas: 2,
    }
    const atualizado = atualizarNotificacaoComoLida(
      estado,
      { id: '1', lidaEm: '2026-09-05T10:00:00.000Z' },
    )

    assert.equal(atualizado.totalNaoLidas, 1)
    assert.equal(atualizado.notificacoes[1], estado.notificacoes[1])
  })
})
