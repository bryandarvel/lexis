# LÉXIS — E2E local (B34 / Issue #31)

Pacote independente: Playwright **1.64.0** e Chromium. Não altera
`frontend/package.json` nem o CI. Node 24 e MySQL 8.4 são a linha de base.

## Preparação no PowerShell

Na raiz deste checkout/branch:

```powershell
npm.cmd --prefix backend ci
npm.cmd --prefix frontend ci
npm.cmd --prefix e2e ci
npm.cmd --prefix e2e run install:chromium
```

O Docker deve estar saudável. Tenha um `TEST_DATABASE_URL` pessoal no
`backend/.env` ignorado, apontando somente para `lexis_test` no loopback.
Não copie o arquivo ou credenciais de outra pessoa. Para carregar **somente**
essa variável no processo atual, ainda na raiz:

```powershell
$e2eDbLine = Get-Content -LiteralPath 'backend/.env' |
  Where-Object { $_ -match '^TEST_DATABASE_URL=' } |
  Select-Object -First 1
$env:TEST_DATABASE_URL = ($e2eDbLine -replace '^TEST_DATABASE_URL=', '').Trim().Trim('"').Trim("'")
cd e2e
npm.cmd run db:prepare
npm.cmd run lint
npm.cmd run test:guards
npm.cmd run test:backend
npm.cmd test
npm.cmd run test:repeat
```

Não imprima `$env:TEST_DATABASE_URL`. A configuração não carrega o restante
do `.env` de desenvolvimento. `db:prepare` valida o destino antes de
gerar o Client, confirma `SELECT DATABASE()` e só então aplica
`migrate deploy` no teste. Não usa reset, drop, seed ou `migrate dev`.
A variável shadow exigida pelo config aponta para um nome local separado
e não é usada pelo comando deploy.

Portas reservadas: API **3100**, Vite **5180**, ambas em 127.0.0.1.
Se estiverem ocupadas, pare e confira quem está usando; o runner recusa
reutilizar servidores existentes. Não pare processos de outro trabalho.
O Playwright inicia/encerra os próprios servidores. Um worker, zero retries;
`test:repeat` repete deliberadamente cada cenário duas vezes.

## O que é real e o que é simulado

- Reais: navegador Chromium, formulários, JWT/cookie HttpOnly/refresh,
  middlewares de papel/propriedade, upload, validação, repositories,
  MySQL, rascunho, revisão obrigatória, envio imutável, IA persistida,
  nota humana, versões e notificação.
- Simulados somente no entrypoint `e2e/server.js`: resposta externa
  OCR e geração externa Gemini. O router de IA usa autenticação e service
  reais, injetando apenas `gerar`. Nenhuma rota HTTP concede privilégios
  de teste; nenhuma rota da aplicação é interceptada pelo browser.
- Desligados: envio Resend e LanguageTool. Falhas externas são cobertas
  pelas suítes backend/B35; este teste não valida qualidade ou disponibilidade
  de serviços reais.

`test:backend` usa a URL OCR padrão que o teste unitário do cliente
verifica, mas carrega um preload que rejeita qualquer `fetch` não
explicitamente simulado. Não chama o OCR real.

O PNG é uma imagem sintética mínima, em memória. A resposta OCR é uma
fixture predeterminada: o teste comprova upload e revisão/persistência,
não capacidade de reconhecer texto em uma foto.

## Dados e evidências

Contas com nomes/e-mails fictícios e senhas/JWTs efêmeros gerados em
execução. Cada cenário registra os IDs que criou, confirma novamente
`lexis_test` e limpa somente esses dados no teardown (também após falha).
Não usa contas demo habituais nem limpa filas globais. Uma interrupção
forçada da máquina pode impedir teardown; não apague dados em massa para
resolver isso.

Seletores usam papéis/rótulos acessíveis, sem coordenadas ou sleeps.
As expectativas verificam respostas e registros reais além da UI.
Não há retries automáticos, gravação de vídeo, screenshots ou traces;
eventuais contextos de erro ficam em `tmp/e2e-results/`, ignorado.

Três cenários encadeiam os fluxos de sessão/papel; propostas e entrega
tardia com rascunho; OCR/revisão/IA consultiva/correção/notificação e
isolamento. Não substituem B03 na máquina do Lucas, B31 WCAG, B46,
avaliação acadêmica da IA ou operação pública.

Depois dos PRs independentes B36/B30/B35/B34 entrarem na `dev`,
repita backend, frontend e E2E no conjunto integrado. Nenhum commit,
push, PR, merge ou deploy é feito por estes scripts.
