# B34 — fluxos integrados de navegador

Issue [#31](https://github.com/bryandarvel/lexis/issues/31).
Branch `test/31-fluxos-navegador`, base `dev` em `2e6a2e6`.

## Entrega

Pacote `e2e/` separado com Playwright 1.64.0 aprovado, Chromium e lockfile
próprios. Sem mudanças nas telas, manifests frontend/backend, migrations
ou workflow. Preparação local com guardas de banco; servidores exclusivos
API 3100/Vite 5180; um worker e zero retries.

O entrypoint de teste mantém auth, autorização, upload, domínio,
repositories e MySQL reais. Simula apenas a fronteira externa OCR e
a geração Gemini (injetando `gerar` no service real). Email e LanguageTool
ficam desativados. Não usa contas demo habituais, seed ou reset.
Cada cenário registra seus IDs, limpa somente esses dados mesmo após
falha normal e verifica que seus usuários/turmas foram removidos.

| Cenário | Evidência |
|---|---|
| Sessão/papel | Login pelo formulário; cookie HttpOnly; refresh real após reload; rota professor recusada ao aluno; logout remove cookie e rota protegida volta ao login |
| Propostas/rascunho/atraso | Todas as propostas da fixture aparecem; vencida abre sem rascunho; salva no servidor e recupera após reload; envio tardio persiste; UI readonly e API recusa alteração |
| OCR até feedback | Upload PNG sintético passa pelo middleware; extração não cria rascunho; confirmação explícita persiste texto revisado e OCR; entrega torna imutável |
| IA e decisão humana | Análise concluída persiste sem criar feedback nem preencher notas; professor altera comentários e digita C1–C5; rascunho privado não aparece ao aluno; publicação explicitamente confirmada |
| Aviso/isolamento | Nota humana 800 e comentário aparecem ao aluno; abrir aviso persiste leitura; outro aluno não acessa feedback nem avisos; outro professor recebe 404 no contrato HTTP |

O PNG mínimo e a resposta OCR predeterminada comprovam o fluxo, não
qualidade de reconhecimento. A leitura do aviso não significa prova
de que o aluno estudou o feedback.

## Verificações executadas

- Instalações limpas backend/frontend/E2E e Chromium: concluídas.
- `npm.cmd run db:prepare`: Client gerado; destino confirmado
  `lexis_test` local antes de `migrate deploy`, sem seed/reset.
- E2E `npm.cmd run lint`: passou.
- E2E `npm.cmd run test:guards`: 2/2 passaram.
- E2E `npm.cmd test`: 3/3 passaram (25,8 s).
- E2E `npm.cmd run test:repeat`: 6/6 passaram (59,8 s),
  cada cenário executado duas vezes, zero retries.
- Frontend lint/test/build: 70/70, zero falhas/cancelados; build Vite 8.1.5 concluído.
- Backend completo `npm.cmd run test:backend`: 272/272 em 59 suítes,
  zero falhas/cancelados/ignorados (56,1 s); lint backend passou.
- Após as execuções E2E, conferidas portas 3100/5180 sem listener:
  servidores próprios encerrados. Docker/MySQL mantidos.
- Conferência final somente de leitura em `lexis_test`: zero contas
  das fixtures `e2e.`, `dominio.` e `fila.` remanescentes.
  Instalação E2E limpa pelo lockfile, lint e guardas reproduzidos ao final.

Durante a construção do harness foram corrigidos: variável shadow
exigida pelo config Prisma; seletores que também encontravam diálogo
oculto/região de mesmo nome; expectativa que precisava consultar
`feedback.versaoAtual`; URL OCR padrão exigida pelo teste existente
do cliente; preload ESM no formato URL file válido no Windows.
Não foram alteradas telas ou asserções existentes para ocultar falhas.

## Reprodução e limites

Siga `e2e/README.md`: carregue somente seu `TEST_DATABASE_URL` pessoal,
prepare o banco, execute guardas, suíte backend e E2E. As senhas e JWTs
de fixture são efêmeros. Não imprimir variáveis, nem compartilhar `.env`.
Sem traces, vídeo ou screenshots; contextos de erro ficam em `tmp/`.

Base independente ainda com Prisma 7.9.1. Após integrar B36 (7.10.0),
B30, B35 e B34 na `dev`, repetir as suítes combinadas. Nenhuma integração
ao CI foi autorizada ou feita. Não comprova provedores reais, IA
acadêmica, auditoria WCAG completa, recuperação B46, operação pública
ou aceite na máquina do Lucas.

## Commit e PR preparados (não executados)

Arquivos: `e2e/package.json`, `e2e/package-lock.json`,
`e2e/runtime.js`, `e2e/playwright.config.js`, `e2e/server.js`,
`e2e/prepare-db.js`, `e2e/fixtures.js`, `e2e/tests/fluxos.spec.js`,
`e2e/guards.test.js`, `e2e/run-backend-tests.js`,
`e2e/block-external-fetch.js`, `e2e/README.md` e este relatório.

Commit: `test: automatiza fluxos integrados existentes no navegador`.

Título: `test: entrega infraestrutura e fluxos E2E locais B34`.

Descrição sugerida:

```text
Closes #31

Introduz pacote E2E separado com Playwright 1.64.0/Chromium,
servidores exclusivos e banco local de teste confirmado. Cobre sessão,
propostas vencidas, rascunho, OCR com revisão, envio imutável, IA
consultiva, correção humana, feedback, avisos e acesso indevido.
Simulação restrita aos provedores; auth e persistência reais.

Verificado: lint E2E, 2 guardas, 3 cenários aprovados e repetição
6/6 sem retries; backend lint e 272 testes; frontend lint, 70 testes e build.
Detalhes e limites em docs/entrega-b34.md.

Sem mudanças de design, dependências do frontend, CI, main ou dev.
Base dev; repetir testes após integrar os quatro PRs técnicos.
```
