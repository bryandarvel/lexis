import swaggerJsdoc from 'swagger-jsdoc'

const opcoesSwagger = {
  definition: {
    openapi: '3.0.3',

    info: {
      title: 'LÉXIS API',
      version: '1.0.0',
      description:
        'API REST da plataforma LÉXIS para análise de repertórios socioculturais em redações.',
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