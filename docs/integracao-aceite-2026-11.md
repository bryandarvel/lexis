# Integração e aceite nas duas máquinas — novembro de 2026

Roteiro da Issue #118, item 17 da meta do Bryan. **Integração técnica não é aceite de interface.** Em 05/11/2026, os 21 PRs anteriores ao #119 estavam integrados na `dev` até `5e9db274178237927c30cc34bbbe7988a2dd8cbc`; a `main` permaneceu em `ffd68fd8ab34fdc5dab1f3fdcc6254491a66c39d`. O #119 encerra o lote como PR documental, sujeito ao próprio CI. Reconfira o hash remoto antes de testar.

## 1. Integrar por etapas verificáveis

A regra é revisão do outro integrante e CI verde no HEAD exato. Bryan autorizou uma exceção de revisão apenas para os 22 PRs deste lote, registrada neles; ela não dispensa CI, dependências ou proteções, nem se estende aos PRs do Lucas. Atualizar uma base exige revisar e testar a nova composição. Usar merge commit exclusivamente em `dev`, sem squash, force push, reset ou exclusão de branches. O roteiro não autoriza promoção para `main`, deploy ou chamadas reais.

| Grupo | Dependência e atenção na integração |
| --- | --- |
| #90, #91, #92, #93 | Integrados em `04549d4`, `4b3caec`, `b220de1` e `be13739`: matrícula confirmada, entrada/arquivamento, primeiro envio e JSON. |
| #56 → #79 → #82 → #83/#84/#85 | Backend #90 antes do cliente #56. Revisar a correção `129678a`. Depois de cada pai integrado, trocar a base do próximo para `dev`, atualizar a branch com cuidado e exigir CI; os três últimos são irmãos, não uma sequência entre si. Preservar a rota OCR ao conciliar imports em AppRoutes. |
| #94 e #102 | Integrados em `b398647` e `df8d4c9`: distinção de feedback indisponível e seleção pública sem análise privada. A interface/cores #44 continua com Lucas. |
| #97 → #116 → #117, com #114 antes de #117 | Integrados em `3266826`, `38df0da`, `5e9db27` e `8ef895a` (#114). Ordem de locks, reabertura, histórico e asserções preservados na conciliação. Fixtures passaram a remover primeiro as notificações dos seus próprios IDs. |
| #95, #96, #98, #99 | Integrados em `df81e7e`, `1c27932`, `6118ac7` e `4da05d3`: reabertura, conta/senha e contagem de entregas. Interfaces, AuthProvider e contadores continuam com Lucas. |
| #101 e #103 | Integrados em `044e710` e `dc6195e`: controle do Gemini e prompt v4, preservando o parser do #93. #70 é comparação e ficou fora do lote. |
| #107, #109, #110 | Integrados em `00b61c3`, `446db45` e `1aa4a7a`. Lockfiles combinados; SSR da #101 passou com o Vite da #110. |
| #111, #113 e este guia | Observabilidade local (`b58ecd4`), preparação acadêmica (`bf6df52`) e entrega documental (#119). Não houve experimento nem provisionamento. |
| #68 e #78 | #68 corrigiu prazo vencido inalterado/segundos no head 0b7368e e recebeu aprovação técnica em 04/11: 21 específicos, 82 testes do head e 110 da composição com dev, lint/build e CI verdes. O merge edece90 foi confirmado depois de uma resposta 502 do endpoint REST; a árvore é idêntica à composição testada cb02f51. Não repetir a operação por causa da resposta de erro. #78 foi ajustado para preservar claro/manual, mas o head c829336 recebeu solicitação de correção por lançar SecurityError ao acessar o getter localStorage fora do try. |

Revisão incremental de 04/11: #82 (`31bf4e5`) e #83 (`9d5df81`) receberam solicitação de mudanças por ocultar/bloquear propostas ativas vencidas ainda pendentes. A entrega com atraso já é permitida: alinhar hook/atalhos ao painel e manter rascunho vencido da turma atual editável, sem liberar arquivadas/já enviadas. #84 repete a seleção de atalho e recebeu aviso de integração; #85 herda o hook da #82. Correções e novas revisões continuam com Lucas.

Os heads #84 (`f34044b`) e #85 (`f2ca6b3`) também receberam solicitação de mudanças por conservar dados da conta anterior após reautenticação como outro aluno: o cabeçalho muda para B, mas Feedbacks/Perfil continuam exibindo dados de A. A reprodução usou frontend e diálogo reais com API inteiramente fictícia, sem demonstrar quebra de autorização do backend. Vincular estado/render e geração de consultas à identidade; ocultar dados antigos e descartar respostas atrasadas, preservando reautenticação da mesma conta. No #83, o mesmo padrão foi identificado por inspeção, sem repetir o fluxo de navegador naquele head. Evidências nas revisões [#84](https://github.com/bryandarvel/lexis/pull/84#pullrequestreview-5767081109) e [#85](https://github.com/bryandarvel/lexis/pull/85#pullrequestreview-5767081540).

O #79 (`a042fcc`) recebeu [parecer funcional favorável](https://github.com/bryandarvel/lexis/pull/79#pullrequestreview-5770866853), não aprovação final para merge: lint, 77 testes e build passaram; Chrome headless com APIs fictícias verificou clique, Enter/Espaço, Tab, rótulos, preferência após reload, menu e gaveta, em 320/768/1440 nos dois temas. A barra não transbordou; isso não é aceite do painel inteiro ou auditoria WCAG completa. Recomendado ampliar a largura mínima do controle para 44 px (a altura já mede 44 px). Depois do #56 integrado, atualizar a base e conferir o novo head com CI antes de integrar.

#61, #63 e #68 estão em `dev`. As dependências da tabela não substituem a revisão técnica de cada diff. As URLs são `https://github.com/bryandarvel/lexis/pull/NUMERO`.

Evidência antes do PR documental: backend com **432/432** testes e lint no HEAD `a22c370` do #117; CI backend e frontend verdes nesse HEAD. Frontend local com **122/122**, lint e build na composição do #110, sem alterações posteriores em `frontend/` até o #117. Prisma 7.10.1 validado, com cinco migrations e paridade de schema conferidas exclusivamente em `lexis_test`. A auditoria combinada registrou **3 alertas moderados** no backend (também com `--omit=dev`: `glob`, `minimatch` e `swagger-jsdoc`), zero altos ou críticos; frontend e E2E sem alertas naquela execução. Esses números não substituem a conferência no hash final nem o aceite nas duas máquinas.

## 2. Preparar cada máquina sem perder trabalho

No checkout escolhido, confirme `git status`. Se houver mudanças, pare e preserve-as na branch correta; não use descarte/stash automático para liberar o checkout. O original `fix/36-controle-cota-gemini` contém trabalho não commitado: **não trocar sua branch nem limpá-lo**. Utilize um checkout limpo já disponível ou combine a preparação de outro ambiente.

Somente depois dos PRs correspondentes entrarem em `dev`, na raiz limpa:

```powershell
git fetch origin
git switch dev
git pull --ff-only origin dev
git status
git rev-parse HEAD
node --version
npm.cmd --version
```

Bryan e Lucas devem testar o mesmo hash completo, com Node 24 e MySQL 8.4. Se houver divergência, preserve os commits e investigue; não force a atualização. Atualizar `origin/dev` não traz PR ainda aberto.

Instale pelos três lockfiles, a partir da raiz; não execute `npm ci` na raiz sem pacote:

```powershell
npm.cmd --prefix backend ci
npm.cmd --prefix frontend ci
npm.cmd --prefix e2e ci
npm.cmd --prefix backend run lint
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
```

Pare no primeiro comando que falhar e registre o resultado. Não rode `npm install`/`audit fix` para ocultar lockfile inconsistente. Cada máquina mantém seu `.env` ignorado, suas chaves e segredos diferentes; copiar `.env.example` só quando o arquivo pessoal ainda não existir. Não sobrescrever a configuração existente. Use o mesmo hostname no frontend, API e `FRONTEND_URL`, sem alternar `localhost` e `127.0.0.1` durante a sessão.

## 3. Banco de teste isolado e suíte automatizada

Abra **outro terminal**, na raiz, só para os testes. Docker deve estar saudável. O `TEST_DATABASE_URL` pessoal deve apontar para MySQL loopback, banco `lexis_test`, com permissão para as migrations. Não imprima a URL. A sequência abaixo carrega apenas essa variável e usa as guardas já existentes em `e2e/`:

```powershell
$linhaBancoAceite = Get-Content -LiteralPath 'backend/.env' |
  Where-Object { $_ -match '^TEST_DATABASE_URL=' } |
  Select-Object -First 1
if (-not $linhaBancoAceite) { throw 'TEST_DATABASE_URL local de teste não encontrado.' }
$env:TEST_DATABASE_URL = ($linhaBancoAceite -replace '^TEST_DATABASE_URL=', '').Trim().Trim('"').Trim("'")
npm.cmd --prefix e2e run test:guards
if ($LASTEXITCODE -ne 0) { throw 'As guardas do banco de teste falharam.' }
npm.cmd --prefix e2e run db:prepare
if ($LASTEXITCODE -ne 0) { throw 'A preparação do banco de teste falhou.' }
```

`db:prepare` recusa URL remota/banco de desenvolvimento, gera o Client, confirma `SELECT DATABASE()` e executa `migrate deploy` somente em `lexis_test`. Não usa reset/drop/seed/shadow para aplicar migrations. Não substitua esse destino pelo banco de demonstração para conseguir passar testes.

O `test:backend` atual do pacote E2E bloqueia todo `fetch`, inclusive o HTTP de loopback exigido pelos quatro testes do SDK do Gemini. O lote foi verificado com um runner isolado que usa as mesmas guardas e permite somente HTTP em `127.0.0.1`, sem redirecionamentos; provedores reais e e-mail continuam bloqueados. Não trate as quatro falhas do runner antigo como falha do produto nem as ignore: a adequação do runner fica na #66. Feche o terminal de teste antes de iniciar a demonstração.

Na execução dos três cenários E2E existentes, sessão e entrega tardia passaram. O cenário OCR parou antes da correção e publicação: a spec busca “Revise o texto transcrito”, mas a rota nova mostra “Revise a transcrição” e “Aceitar e continuar”. Isso evidencia seletor desatualizado, não comprova o restante do fluxo. A adaptação da #66 continua com Lucas. Com cenários revisados e portas 3100/5180 livres:

```powershell
npm.cmd --prefix e2e run install:chromium
npm.cmd --prefix e2e run lint
npm.cmd --prefix e2e test
npm.cmd --prefix e2e run test:repeat
```

A instalação do Chromium baixa o navegador, não envia redações. Os cenários devem continuar bloqueando provedores externos, usar contas efêmeras e limpar apenas seus IDs. Não parar processo de outro trabalho para liberar porta. Um worker e zero retries permanecem; `test:repeat` é repetição deliberada, não retry oculto. Falha no seletor não autoriza enfraquecer uma asserção de domínio. Este guia não adiciona job de CI nem cenários: a #66 só conclui quando o job existir e passar.

## 4. Demonstração local e aceite por fluxo

Para usar o banco local de demonstração, seguir [atualizacao-dev.md](atualizacao-dev.md): confirmar `DATABASE_URL` local e backup antes de migrations novas, instalar Client da versão correspondente e iniciar backend/frontend em terminais próprios. Não repetir seed em banco já usado; [aceite-b01-b04.md](aceite-b01-b04.md) explica a correção pontual do código fictício. Nunca compartilhar senhas ou `.env`.

Os passos seguintes usam exclusivamente contas e redações fictícias. Não apagar trabalho real nem atribuir nota/publicar sem confirmação humana. A UI ainda não integrada deve ser marcada **pendente**, não substituída por uma chamada HTTP e declarada aprovada.

| Fluxo | Evidência necessária nas duas máquinas |
| --- | --- |
| Sessão e #71/#49 | Login por papel, reload/refresh, logout; nome atualizado; senha trocada mantém sessão atual e revoga sessões antigas. OCR é descartado na troca efetiva de usuário, preservado na reautenticação da mesma conta. Em Perfil, Feedbacks e Minhas redações, reautenticar como B não mantém dados de A nem aceita respostas pendentes de A; repetir também a reautenticação da mesma conta. Sem senha/token/texto integral da redação em armazenamento local; preservar o rascunho privado da correção docente conforme o contrato existente. |
| Turma e #54/#55 | Código válido, matrícula confirmada por ID, contagem de alunos ativos distintos e entregas históricas separadas. Saída/reentrada conserva histórico; desempenho informa todas as turmas, sem duplicar correções. |
| #64/#72/#55 | Envio cria aviso do professor; desvinculação/arquivamento avisam aluno; saída voluntária avisa professor. Avisos sem feedback não oferecem “Ver correção”. Ler aviso próprio é idempotente; outra conta não o acessa. Nenhum novo evento gera e-mail. |
| Propostas e reabertura | Conteúdo não muda após primeira entrega; prazo inalterado não bloqueia conteúdo permitido antes dela. Reabrir turma não restaura matrícula; reabrir proposta conserva prazo e sinaliza atraso quando aplicável. |
| OCR e envio | Extração fictícia/simulada ou real especificamente autorizada; revisão e salvamento pelo aluno antes do envio. Texto entregue imutável; ex-aluno lê próprios dados, mas não escreve na turma antiga. |
| Gemini #36/#100 | Análise consultiva não preenche nota; sucesso exibe evidências literais, inclusive sobreposição quando houver. Falha/cooldown explícitos não apagam resultado anterior nem afirmam sucesso novo. Não exigir cores mínimas ou repertórios inventados. |
| Feedback #45/#42 | Rascunho humano privado; publicação explícita. Marcações aprovadas e literalidade/versionamento preservados; aluno recebe só publicação, sem análise privada. Outro aluno não acessa; feedback próprio não publicado difere de recurso inexistente. |
| Interface e regressão | Claro no primeiro acesso, escolha manual salva, teclado/foco, leitura e impressão em ambos os temas/conteúdo longo; verificar telas e integrações novas com Lucas. Estes passos não equivalem a auditoria WCAG completa. |

Gemini/OCR/Resend reais **não** são chamados pela preparação automatizada. Para uma demonstração real, pedir autorização separada com texto, provedor, destinatário quando houver, quantidade e eventual custo. Registrar modelo/prompt, horário, erro e Request ID seguros; não mandar chaves, HAR, tokens ou texto real. Um sucesso anterior não comprova disponibilidade atual; a fixture não é avaliação acadêmica.

## 5. Registrar e fechar os gates

Preencher uma cópia privada de [registro-aceite-integrado.md](registro-aceite-integrado.md), por máquina e hash. Guardar evidências locais em `output/`, sem versionar dados sensíveis. Se algo falhar, registrar passo/resultado e Issue, corrigir em branch própria e repetir o conjunto afetado. Não corrigir diretamente em `dev`/`main`.

O aceite técnico exige composição integrada, CI e testes locais do mesmo commit, roteiros de ambas as máquinas e pendências explícitas. Não basta somar contagens de testes das branches. Corpus/protocolo/referências humanas continuam gates separados. A proposta técnica de [deploy](plano-deploy-vercel-railway.md) foi aprovada em 04/11 sem provisionamento agora; recursos concretos, domínio, orçamento e retenção ainda exigem aprovação antes de qualquer execução.
