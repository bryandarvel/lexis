# LÉXIS

O LÉXIS é uma plataforma web para escrever, corrigir e acompanhar redações. O aluno recebe uma proposta da turma, prepara o texto e o envia. O professor lê a redação, marca trechos, comenta os critérios e publica a nota. Na devolutiva, o aluno pode seguir cada comentário até a passagem que o motivou, inclusive na versão para impressão.

Trabalho de Conclusão de Curso de Bryan Darvel Cavalheiro e Lucas Schulz. A entrega à banca é o código-fonte deste repositório; a demonstração é executada localmente.

[![Integração contínua](https://github.com/bryandarvel/lexis/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bryandarvel/lexis/actions/workflows/ci.yml)

## Percurso de uma redação

1. **Proposta.** O professor cria a turma e publica título, comando, prazo e critérios. A avaliação do repertório sociocultural na Competência II parte de três critérios fixos — legitimação, pertinência e uso produtivo — e admite até dois personalizados. A primeira entrega bloqueia mudanças no conteúdo e nos critérios; o prazo ainda pode ser ajustado.
2. **Escrita e entrega.** O aluno entra na turma por código. Pode digitar a redação, com rascunho salvo no servidor, ou enviar uma foto e revisar a transcrição antes de confirmá-la. A revisão linguística é opcional. O envio definitivo torna o texto imutável; uma proposta aberta ainda aceita entrega após o prazo, identificada como atrasada.
3. **Correção.** O painel do professor destaca a redação que espera há mais tempo, permite filtrar a fila por turma e mostra os prazos dos próximos sete dias, inclusive propostas sem entregas. O professor pode consultar sugestões do Gemini ou corrigir sem IA. **Somente o professor atribui as notas das cinco competências e publica o feedback.**
4. **Devolutiva.** O aluno recebe um aviso interno e consulta nota, comentários e trechos numerados em *Minhas redações*. Uma nova publicação com alterações preserva o histórico; o sistema bloqueia a republicação idêntica.

## Como o sistema está organizado

| Onde ler o código | Responsabilidade |
| --- | --- |
| [Frontend](frontend/src) | React e Vite. Páginas de aluno e professor, editor, tela de correção, navegação por teclado e temas claro e escuro. |
| [Módulos da API](backend/src/modules) | Node.js e Express. Rotas, validação, autorização, regras de negócio e repositórios. O servidor verifica o papel e o vínculo do usuário com cada recurso. |
| [Modelo de dados](backend/prisma/schema.prisma) e [migrations](backend/prisma/migrations) | Prisma e MySQL 8.4. Persistência de matrículas, propostas, redações, análises, versões do feedback e notificações. |
| [Integrações](backend/src/integrations) | Clientes dos serviços de OCR, análise, revisão linguística e e-mail. As credenciais ficam no backend. |
| [Testes de ponta a ponta](e2e) | Playwright e Chromium exercitam a interface com a API e um banco local de teste. |

O access token fica em memória no cliente; o refresh token é rotacionado em cookie HttpOnly. O editor não grava o texto integral da redação no armazenamento local do navegador. O rascunho de correção do professor é separado por usuário e redação e removido no logout.

## Executar localmente

Requisitos: Git, Node.js 24 com npm e Docker com Compose para o MySQL. Os comandos abaixo usam PowerShell. Abra os dois terminais na raiz do repositório.

**Terminal 1 — backend.** Em uma instalação nova:

```powershell
cd backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
docker compose up -d
```

Antes de continuar, edite **apenas o seu** `backend/.env`. Defina dois segredos JWT diferentes; para gerar cada um, execute separadamente `node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"`. Confira se `DATABASE_URL` aponta para o MySQL **local de desenvolvimento**. Não use um banco remoto ou de produção para os comandos abaixo.

```powershell
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run dev
```

Com a API em execução: [estado do serviço](http://localhost:3000/health) · [documentação interativa da API](http://localhost:3000/api-docs).

**Terminal 2 — frontend:**

```powershell
cd frontend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run dev
```

Abra [localhost:5173](http://localhost:5173). Use a origem configurada em `FRONTEND_URL` no backend e, no frontend, confira `VITE_API_URL`. Nos próximos usos, com as dependências instaladas e o MySQL em execução, basta iniciar `npm.cmd run dev` em cada pasta.

**Dados para demonstração:** em um banco local reservado para esse fim, execute `npm.cmd run db:seed` e `npm.cmd run db:seed:verify` a partir de `backend/`. O seed informa as contas fictícias na saída. **Não o repita no banco preparado para a defesa:** ele redefine dados dessas contas e de seus trabalhos.

## Integrações e limites

| Recurso | Quando é usado |
| --- | --- |
| OCR.space | Ao enviar uma foto da redação. Requer chave própria; o aluno revisa e salva a transcrição antes da entrega. A escrita por digitação não depende do OCR. |
| Google Gemini | Quando o professor solicita uma análise. As sugestões não atribuem nota nem são publicadas automaticamente. Consulte [configuração, cotas e tratamento de falhas](docs/operacao-gemini.md). |
| LanguageTool | Quando o aluno solicita a revisão. O editor sublinha os trechos e oferece sugestões, sem impedir o salvamento ou o envio. Vem desativado; para usar uma instância local, ajuste `LANGUAGETOOL_ENABLED` e `LANGUAGETOOL_API_URL` no backend. |
| Resend | Nos fluxos de conta que exigem e-mail. Habilite o serviço e siga o [guia de operação da fila](docs/operacao-email.md). Os avisos de correção dentro da plataforma não dependem de e-mail. |

Não versione arquivos `.env`, credenciais nem redações reais. Para uma demonstração com provedores externos, use texto e imagens fictícios. Os testes automatizados verificam os fluxos da aplicação; não medem a qualidade pedagógica do modelo. O [protocolo acadêmico de avaliação da IA](docs/protocolo-academico-ia.md) trata essa questão separadamente.

## Verificar a instalação e o código

Na raiz, com as dependências dos pacotes instaladas:

```powershell
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
npm.cmd --prefix backend run lint
```

Para os testes de integração do backend e a suíte de navegador, siga o [roteiro E2E para PowerShell](e2e/README.md). Ele mostra como instalar o Chromium, carregar somente a variável de conexão de teste e executar `db:prepare` **antes** das suítes. O destino deve ser o banco `lexis_test` em loopback, nunca o banco da demonstração. O [workflow do GitHub Actions](.github/workflows/ci.yml) executa os checks de backend, frontend e E2E.

## Leituras técnicas

- [Trechos e comentários](docs/contrato-trechos-feedback.md) e [contagem de entregas](docs/contrato-contagem-entregas.md): regras que explicam os vínculos no feedback e os números exibidos por turma.
- [Perfil e senha](docs/contrato-perfil-senha.md) e [exclusões](docs/contrato-exclusoes.md): alterações de conta, proteção do histórico e condições de exclusão.
- [Avaliação técnica da IA](docs/avaliacao-ia.md), [observabilidade local](docs/observabilidade-local.md) e [segurança das dependências](docs/seguranca-dependencias.md).
- [Guia de contribuição](CONTRIBUTING.md): fluxo de desenvolvimento na `dev` e promoção da versão estável para a `main`.
