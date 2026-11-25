import { criarAutenticadorAccessToken } from '../../src/middlewares/authenticate-access-token.js'

// Testes de contrato de rotas isolam o banco, preservando a validação real do JWT.
export const autenticarTeste = criarAutenticadorAccessToken({
  buscarUsuario: async (_id, payload) => ({ ativo: true, sessaoVersao: 0, papel: payload.papel }),
})
