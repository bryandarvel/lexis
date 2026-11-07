import swaggerJsdoc from 'swagger-jsdoc'

const opcoesSwagger = {
  definition: {
    openapi: '3.0.3',

    info: {
      title: 'LÉXIS API',
      version: '1.0.0',
      description:
        'API REST da plataforma LÉXIS para análise de repertórios socioculturais em redações. O parser é global: requisições com Content-Type application/json podem receber 400 INVALID_JSON antes da autenticação se o JSON for inválido; corpos JSON ou urlencoded acima de 1 MB recebem 413 PAYLOAD_TOO_LARGE.',
    },

 servers: [
  {
    url: '/',
    description: 'Mesmo endereço da documentação',
  },
],

    tags: [
      {
        name: 'Infraestrutura',
        description:
          'Verificação do funcionamento da API e do banco de dados.',
      },
      {
        name: 'Autenticação',
        description:
          'Cadastro, login e renovação de sessão.',
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },

        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'lexis_refresh_token',
          description:
            'Refresh token armazenado em cookie HttpOnly.',
        },
      },
    },
  },

  apis: ['./src/app.js', './src/modules/**/*.routes.js'],
}

export const swaggerSpec = swaggerJsdoc(opcoesSwagger)

function respostaErroDoParser(codigo, mensagem, descricao) {
  return {
    description: descricao,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', enum: [codigo], example: codigo },
                message: { type: 'string', example: mensagem },
              },
            },
          },
        },
      },
    },
  }
}

swaggerSpec.components.responses = {
  ...swaggerSpec.components.responses,
  InvalidJson: respostaErroDoParser('INVALID_JSON', 'O corpo da requisição contém JSON inválido.', 'JSON malformado (400 INVALID_JSON).'),
  PayloadTooLarge: respostaErroDoParser('PAYLOAD_TOO_LARGE', 'O corpo da requisição excede o limite permitido.', 'Corpo acima de 1 MB (413 PAYLOAD_TOO_LARGE).'),
}

// O middleware é compartilhado; documenta os erros em todas as operações que
// declaram corpo JSON, sem repetir blocos nas rotas ou substituir erros de domínio.
for (const item of Object.values(swaggerSpec.paths)) {
  for (const metodo of ['post', 'put', 'patch', 'delete']) {
    const operacao = item[metodo]
    if (!operacao?.requestBody?.content?.['application/json']) continue
    for (const [status, nome] of [['400', 'InvalidJson'], ['413', 'PayloadTooLarge']]) {
      if (operacao.responses[status]) {
        operacao.responses[status].description += ` Também pode ocorrer: ${swaggerSpec.components.responses[nome].description}`
      } else {
        operacao.responses[status] = { $ref: `#/components/responses/${nome}` }
      }
    }
  }
}
