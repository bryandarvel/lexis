// Texto único da regra de senha. Espelha senhaCadastroSchema do backend
// (backend/src/modules/auth/auth.schemas.js): de 10 a 72 caracteres, com pelo
// menos uma letra minúscula, uma maiúscula e um número. Além do limite de
// caracteres, o backend recusa senhas com mais de 72 bytes em UTF-8; letras
// acentuadas e emoji ocupam mais de um byte, então o limite de bytes vale
// antes do de caracteres nesses casos. Caractere especial não é exigido.
// Alterar a regra no backend exige atualizar esta frase.
export const REGRA_SENHA =
  'Use de 10 a 72 caracteres (até 72 bytes), com letra maiúscula, minúscula e número.'

// Erro de campo da redefinição: a regra já está na dica acima do campo.
export const ERRO_SENHA_REQUISITOS = 'A senha não atende aos requisitos acima.'

// Erros de campo do cadastro. Apontam a regra que falhou sem contradizer
// REGRA_SENHA, que continua visível como dica do campo.
export const ERRO_SENHA_TAMANHO = 'A senha deve ter de 10 a 72 caracteres.'

export const ERRO_SENHA_COMPOSICAO =
  'A senha precisa de letra maiúscula, minúscula e número.'
