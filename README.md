# LÉXIS

Plataforma web acadêmica para produção, análise e correção de redações, desenvolvida como Trabalho de Conclusão de Curso.

[![Integração contínua](https://github.com/bryandarvel/lexis/actions/workflows/ci.yml/badge.svg)](https://github.com/bryandarvel/lexis/actions/workflows/ci.yml)

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

O desenvolvimento ocorre em branches separadas, com integração por Pull Request. Toda correção, melhoria ou nova funcionalidade deve começar por uma Issue. Como o repositório é privado, cada integrante precisa aceitar o convite de colaboração antes de cloná-lo.

Clone inicial:

```powershell
cd 'C:\Users\NOME_DO_USUARIO\Documents'
git clone https://github.com/bryandarvel/lexis.git
cd lexis
```

Antes de iniciar uma tarefa, atualize a `main` e crie uma branch própria:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feat/NUMERO-nome-curto-da-tarefa
```

O Pull Request deve mencionar a Issue com `Closes #NUMERO`, passar pela integração contínua e ser revisado pelo outro integrante antes do merge.

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para conhecer a rotina completa de Issues, branches, commits, push, revisão e Pull Request. Agentes de IA também devem seguir as regras de [AGENTS.md](AGENTS.md).

## Segurança

Nunca envie ao GitHub:

- arquivos `.env`;
- chaves de API;
- segredos JWT;
- senhas pessoais;
- pastas `node_modules`, `dist`, `coverage` ou `tmp`.

Somente os arquivos `.env.example`, contendo valores demonstrativos, devem ser versionados.
