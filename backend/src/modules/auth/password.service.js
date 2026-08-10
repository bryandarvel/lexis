import bcrypt from 'bcrypt'

import { env } from '../../config/env.js'

export async function criarHashSenha(senha) {
  return bcrypt.hash(senha, env.BCRYPT_ROUNDS)
}

export async function verificarSenha(senha, senhaHash) {
  return bcrypt.compare(senha, senhaHash)
}