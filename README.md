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
- **Revisão linguística opcional:** LanguageTool, desativado por padrão.
- **E-mail transacional:** Resend em modo de demonstração.
- **Documentação da API:** Swagger/OpenAPI.
- **Qualidade:** Oxlint, Node Test Runner e Supertest.

## Experiência e acessibilidade

- O tema claro é usado no primeiro acesso; o usuário pode alternar manualmente para o tema escuro e a preferência fica salva no navegador.
- O tema escuro segue superfícies navy em níveis de elevação, sem depender de sombras ou brilhos decorativos.
- A tela de correção usa três colunas em telas largas, duas colunas com abas em tablets e um bottom sheet acessível em celulares.
- Campos de autenticação mantêm colagem e preenchimento por gerenciadores de senha.
- Nota e comentários ainda não enviados possuem autosave local. O texto da redação do aluno não é duplicado no armazenamento do navegador.
- Quando a renovação silenciosa falha, a reautenticação acontece sobre a tela atual, preservando o rascunho e a rota.

## Fluxos implementados

### Aluno

1. entra em uma turma por código e consulta os temas publicados;
2. cria ou edita uma redação com salvamento explícito e automático no servidor;
3. pode extrair texto de JPEG/PNG pelo OCR, revisar o resultado e só então confirmá-lo;
4. pode solicitar manualmente sugestões do LanguageTool, quando o serviço estiver habilitado;
5. confirma o envio irreversível da redação;
6. recebe uma notificação quando o professor publica o feedback;
7. marca o aviso como lido e acessa a correção, a nota e os comentários.

### Professor

1. cria turmas e temas;
2. pode iniciar um tema com o modelo editável da Competência II — Legitimação, Pertinência e Uso produtivo — ou usar critérios próprios;
3. edita e ordena critérios até a primeira redação do tema; depois disso, o conjunto fica congelado;
4. consulta redações enviadas e solicita uma análise consultiva do Gemini;
5. revisa somente evidências posicionais verificadas no texto;
6. salva rascunhos de correção e publica o feedback final, que cria a notificação do aluno.

A análise por IA não atribui nota e não substitui a decisão do professor. As cinco notas por competência do ENEM e a nota total pertencem ao feedback docente.

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

Para popular o ambiente local com dados fictícios de demonstração:

```powershell
npm.cmd run db:seed
npm.cmd run db:seed:verify
```

O seed é idempotente, recusa execução em produção e usa contas `@lexis.example.com`. A senha conhecida das contas fictícias é documentada na saída do comando; nunca a reutilize em outro ambiente.

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
npm.cmd test
npm.cmd run build
```

Os testes de integração do backend utilizam o banco indicado por `TEST_DATABASE_URL`. Ele deve estar criado e com as migrações aplicadas antes da execução completa dos testes.

O harness técnico da IA roda sem chamada externa por padrão:

```powershell
cd backend
npm.cmd run ai:evaluate -- --limite=2
```

Os relatórios locais são gravados em `backend/output/ai-evaluation` e não são versionados. Consulte [docs/avaliacao-ia.md](docs/avaliacao-ia.md) antes de interpretar ou executar o modo real.

## Serviços externos e privacidade

- OCR.space e Gemini recebem somente o conteúdo necessário ao recurso solicitado; chaves e limites pertencem a cada desenvolvedor.
- O LanguageTool só é chamado por ação explícita do aluno. O padrão aponta para uma instância local e fica desativado.
- A API pública gratuita do LanguageTool não é adequada para automação contínua; possui limites, não oferece garantia de disponibilidade e exige atenção à privacidade.
- Em desenvolvimento, o Resend redireciona mensagens para `EMAIL_DEMO_RECIPIENT`.

## Limitações conhecidas

- A fixture sintética da IA valida o harness, não a qualidade do modelo.
- A validação acadêmica ainda requer corpus autorizado, referências humanas, protocolo de avaliação e análise estatística.
- O Essay-BR contém notas por competência, mas não anota os intervalos textuais usados pela LÉXIS; portanto, não basta sozinho para medir a qualidade das evidências destacadas.
- LanguageTool, OCR, Gemini e e-mail dependem de serviços/configurações externos e podem ficar indisponíveis. As interfaces preservam o texto e exibem falhas sem publicar resultados automaticamente.
- O produto atual é uma aplicação web responsiva; não existe aplicativo móvel nativo.

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

O estado conhecido da auditoria de dependências e as medidas pendentes estão em [docs/seguranca-dependencias.md](docs/seguranca-dependencias.md). O frontend está sem alertas no `npm audit`; o backend ainda depende de correções upstream do ecossistema Prisma e não deve ser tratado como pronto para produção pública sem nova revisão.

Nunca envie ao GitHub:

- arquivos `.env`;
- chaves de API;
- segredos JWT;
- senhas pessoais;
- pastas `node_modules`, `dist`, `coverage` ou `tmp`.

Somente os arquivos `.env.example`, contendo valores demonstrativos, devem ser versionados.

O access token permanece somente em memória e o refresh token é rotacionado em cookie HttpOnly. No logout, rascunhos privados do usuário são removidos, mas preferências não sensíveis, como o tema escolhido, são preservadas.
