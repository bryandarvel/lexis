import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  cadastroSchema,
  loginSchema,
} from '../../src/modules/auth/auth.schemas.js'

describe('Schemas de autenticação', () => {
  it('deve validar e normalizar um cadastro correto', () => {
    const resultado = cadastroSchema.parse({
      nome: '  Maria   da Silva  ',
      email: 'MARIA.SILVA@EXEMPLO.COM',
      senha: 'SenhaSegura123',
      papel: 'ALUNO',
    })

    assert.deepEqual(resultado, {
      nome: 'Maria da Silva',
      email: 'maria.silva@exemplo.com',
      senha: 'SenhaSegura123',
      papel: 'ALUNO',
    })
  })

  it('deve rejeitar dados de cadastro inválidos', () => {
    const resultado = cadastroSchema.safeParse({
      nome: 'A',
      email: 'email-invalido',
      senha: 'fraca',
      papel: 'ADMINISTRADOR',
    })

    assert.equal(resultado.success, false)
  })

  it('deve rejeitar campos inesperados no cadastro', () => {
    const resultado = cadastroSchema.safeParse({
      nome: 'Carlos Pereira',
      email: 'carlos@exemplo.com',
      senha: 'SenhaSegura123',
      papel: 'PROFESSOR',
      ativo: true,
    })

    assert.equal(resultado.success, false)
  })

  it('deve normalizar o e-mail sem alterar a senha do login', () => {
    const resultado = loginSchema.parse({
      email: '  ALUNO@EXEMPLO.COM  ',
      senha: ' SenhaComEspaco1 ',
    })

    assert.equal(resultado.email, 'aluno@exemplo.com')
    assert.equal(resultado.senha, ' SenhaComEspaco1 ')
  })
})