# LÉXIS

Plataforma web acadêmica para produção, análise e correção de redações, desenvolvida como Trabalho de Conclusão de Curso.

## Arquitetura

- **Frontend:** React, Vite, Tailwind CSS, Motion e GSAP.
- **Backend:** Node.js e Express.
- **Banco de dados:** MySQL 8.4, Prisma ORM e Docker Compose.
- **Autenticação:** JWT, refresh token em cookie HttpOnly e bcrypt.
- **OCR:** OCR.space.
- **Inteligência artificial:** Google Gemini.
- **E-mail transacional:** Resend em modo de demonstração.
- **Documentação da API:** Swagger/OpenAPI.
- **Qualidade:** Oxlint, Node Test Runner e Supertest.

## Pré-requisitos

- Node.js compatível com o projeto.
- npm.
- Git.
- Docker Desktop.

As chaves do OCR.space, Gemini e Resend são pessoais. Cada desenvolvedor deve utilizar suas próprias credenciais no arquivo `backend/.env`.

## Configuração inicial

### 1. Backend

No PowerShell, a partir da raiz do projeto:

```powershell
cd backend
Copy-Item .env.example .env
npm.cmd install
docker compose up -d
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run dev
```

Antes de iniciar a API, substitua no `backend/.env` os segredos JWT e as chaves dos serviços externos. O arquivo real `.env` não deve ser versionado.

A API estará disponível em `http://127.0.0.1:3000` e a documentação em `http://127.0.0.1:3000/api-docs`.

### 2. Frontend

Em outro terminal, a partir da raiz do projeto:

```powershell
cd frontend
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

O frontend estará disponível em `http://localhost:5173`.

## Verificações

Backend:

```powershell
cd backend
npm.cmd run lint
npm.cmd test
```

Frontend:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

Os testes de integração do backend utilizam o banco indicado por `TEST_DATABASE_URL`. Ele deve estar criado e com as migrações aplicadas antes da execução completa dos testes.

## Colaboração

O desenvolvimento ocorre em branches separadas, com integração por Pull Request. Consulte [CONTRIBUTING.md](CONTRIBUTING.md) antes de iniciar uma alteração.

## Segurança

Nunca envie ao GitHub:

- arquivos `.env`;
- chaves de API;
- segredos JWT;
- senhas pessoais;
- pastas `node_modules`, `dist`, `coverage` ou `tmp`.

Somente os arquivos `.env.example`, contendo valores demonstrativos, devem ser versionados.
