import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  gerarCodigoAcessoTurma,
} from '../../src/modules/turmas/turma-code.service.js'

describe('Gerador de código de turma', () => {
  it('deve gerar um código com o formato esperado', () => {
    const codigo = gerarCodigoAcessoTurma()

    assert.match(codigo, /^[A-HJ-NP-Z2-9]{8}$/)
  })

  it('deve gerar somente códigos válidos', () => {
    const codigos = Array.from(
      { length: 100 },
      () => gerarCodigoAcessoTurma(),
    )

    for (const codigo of codigos) {
      assert.match(codigo, /^[A-HJ-NP-Z2-9]{8}$/)
    }
  })
})