import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  listarNotificacoesParaAluno,
  marcarNotificacaoLidaParaAluno,
} from '../../src/modules/notificacoes/notificacoes.service.js'

describe('Serviço de notificações', () => {
  it('deve listar notificações e o total não lido', async () => {
    const esperado = {
      notificacoes: [
        {
          id: 'notificacao-1',
        },
      ],
      totalNaoLidas: 1,
    }

    const resultado = await listarNotificacoesParaAluno(
      {
        alunoId: 'aluno-1',
      },
      {
        listar: async () => esperado,
      },
    )

    assert.equal(resultado, esperado)
  })

  it('deve marcar a notificação usando o instante informado', async () => {
    const lidaEm = new Date('2026-08-07T15:00:00.000Z')
    let dadosRecebidos
    const notificacao = {
      id: 'notificacao-1',
      lidaEm,
    }

    const resultado = await marcarNotificacaoLidaParaAluno(
      {
        notificacaoId: 'notificacao-1',
        alunoId: 'aluno-1',
      },
      {
        agora: () => lidaEm,
        marcarComoLida: async (dados) => {
          dadosRecebidos = dados
          return {
            status: 'NOTIFICACAO_LIDA',
            notificacao,
          }
        },
      },
    )

    assert.deepEqual(dadosRecebidos, {
      notificacaoId: 'notificacao-1',
      alunoId: 'aluno-1',
      lidaEm,
    })
    assert.equal(resultado, notificacao)
  })

  it('deve ocultar notificações de outro usuário', async () => {
    await assert.rejects(
      () =>
        marcarNotificacaoLidaParaAluno(
          {
            notificacaoId: 'notificacao-1',
            alunoId: 'aluno-1',
          },
          {
            marcarComoLida: async () => ({
              status: 'NOTIFICACAO_INDISPONIVEL',
              notificacao: null,
            }),
          },
        ),
      (erro) => {
        assert.equal(erro.statusCode, 404)
        assert.equal(erro.code, 'NOTIFICATION_NOT_FOUND')
        return true
      },
    )
  })
})
