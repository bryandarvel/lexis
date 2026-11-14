// Texto único da regra de senha. Espelha senhaCadastroSchema do backend
// (backend/src/modules/auth/auth.schemas.js): de 10 a 72 caracteres, com pelo
// menos uma letra minúscula, uma maiúscula e um número. Caractere especial não
// é exigido. Alterar a regra no backend exige atualizar esta frase.
export const REGRA_SENHA =
  'Use de 10 a 72 caracteres, com letra maiúscula, minúscula e número.'

// Erros de campo do cadastro. Apontam a regra que falhou sem contradizer
// REGRA_SENHA, que continua visível como dica do campo.
export const ERRO_SENHA_TAMANHO = 'A senha deve ter de 10 a 72 caracteres.'

export const ERRO_SENHA_COMPOSICAO =
  'A senha precisa de letra maiúscula, minúscula e número.'
