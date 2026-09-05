import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  revisarLinguagemParaAluno,
} from '../../src/modules/redacoes/redacoes.service.js'
import { AppError } from '../../src/utils/app-error.js'

const entrada = {
  temaId: 'tema-1',
  alunoId: 'aluno-1',
  texto: 'Texto integral preservado.',
}

describe('Revisão linguística da redação', () => {
  it('retorna as sugestões sem salvar ou alterar o texto', async () => {
    let textoRecebido
    const revisao = await revisarLinguagemParaAluno(
      entrada,
      {
        verificar: async () => ({ status: 'DISPONIVEL' }),
        revisar: async ({ texto }) => {
          textoRecebido = texto
          return {
            disponivel: true,
            status: 'CONCLUIDO',
            sugestoes: [],
          }
        },
      },
    )

    assert.equal(textoRecebido, entrada.texto)
    assert.equal(revisao.status, 'CONCLUIDO')
  })

  it('abre a falha e preserva o fluxo quando o serviço externo cai', async () => {
    const revisao = await revisarLinguagemParaAluno(
      entrada,
      {
        verificar: async () => ({ status: 'DISPONIVEL' }),
        revisar: async () => {
          throw new AppError('Indisponível.', {
            statusCode: 502,
            code: 'LANGUAGETOOL_UNAVAILABLE',
          })
        },
      },
    )

    assert.equal(revisao.disponivel, false)
    assert.equal(revisao.status, 'INDISPONIVEL')
    assert.equal(
      revisao.motivo,
      'LANGUAGETOOL_UNAVAILABLE',
    )
    assert.deepEqual(revisao.sugestoes, [])
  })

  it('não chama o serviço quando a redação já é imutável', async () => {
    let chamado = false

    await assert.rejects(
      () =>
        revisarLinguagemParaAluno(
          entrada,
          {
            verificar: async () => ({
              status: 'REDACAO_IMUTAVEL',
            }),
            revisar: async () => {
              chamado = true
            },
          },
        ),
      (erro) => {
        assert.equal(erro.code, 'ESSAY_ALREADY_SUBMITTED')
        return true
      },
    )

    assert.equal(chamado, false)
  })
})
