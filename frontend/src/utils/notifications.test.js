import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  atualizarNotificacaoComoLida,
  descreverAcaoNotificacao,
  obterLinkNotificacao,
} from './notifications.js'

const feedback = (redacaoId = 'redacao-1') => ({
  tipo: 'FEEDBACK_PUBLICADO',
  feedbackVersao: { feedback: { redacaoId } },
})

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

  it('leva à correção nos dois tipos de feedback publicado', () => {
    for (const tipo of ['FEEDBACK_PUBLICADO', 'FEEDBACK_CORRIGIDO']) {
      const acao = descreverAcaoNotificacao({ ...feedback(), tipo })

      assert.equal(acao.destino, '/aluno/redacoes/redacao-1/feedback')
      assert.equal(acao.rotulo, 'Ver correção →')
      assert.equal(acao.rotuloProcessando, 'Abrindo correção...')
      assert.equal(acao.acionavel, true)
    }
  })

  // O ponto da #115: avisos de matrícula não têm correção para abrir.
  it('avisos de matrícula não oferecem "Ver correção" nem destino', () => {
    for (const tipo of ['MATRICULA_ENCERRADA', 'TURMA_ARQUIVADA']) {
      const acao = descreverAcaoNotificacao({ tipo, lidaEm: null })

      assert.equal(acao.destino, null)
      assert.equal(acao.rotulo, 'Marcar como lido')
      assert.equal(acao.rotuloProcessando, 'Marcando como lido...')
      assert.equal(acao.acionavel, true)
      assert.doesNotMatch(acao.rotulo, /corre[çc]/i)
    }
  })

  it('aviso de matrícula já lido não vira ação sem efeito', () => {
    const acao = descreverAcaoNotificacao({
      tipo: 'TURMA_ARQUIVADA',
      lidaEm: '2026-11-05T10:00:00.000Z',
    })

    assert.equal(acao.destino, null)
    assert.equal(acao.acionavel, false)
    assert.equal(acao.rotulo, 'Lido')
  })

  it('tipo desconhecido não quebra e não promete correção', () => {
    for (const notificacao of [
      { tipo: 'TIPO_QUE_AINDA_NAO_EXISTE' },
      { tipo: 'ALUNO_SAIU_TURMA' },
      {},
      null,
      undefined,
    ]) {
      const acao = descreverAcaoNotificacao(notificacao)

      assert.equal(acao.destino, null)
      assert.doesNotMatch(acao.rotulo, /corre[çc]/i)
      assert.equal(typeof acao.rotulo, 'string')
    }
  })

  // O backend pode mandar o tipo de feedback sem a versão vinculada; não
  // inventamos uma redação nem mandamos o aluno para uma rota inexistente.
  it('tipo de feedback sem redação vinculada não vira link de correção', () => {
    const acao = descreverAcaoNotificacao({
      tipo: 'FEEDBACK_PUBLICADO',
      feedbackVersao: null,
      lidaEm: null,
    })

    assert.equal(acao.destino, null)
    assert.equal(acao.rotulo, 'Marcar como lido')
  })

  it('o id da redação é codificado no destino', () => {
    assert.equal(
      descreverAcaoNotificacao(feedback('redacao/1')).destino,
      '/aluno/redacoes/redacao%2F1/feedback',
    )
  })
})
