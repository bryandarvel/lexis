# Integração e aceite nas duas máquinas — novembro de 2026

Roteiro da Issue #118, item 17 da meta do Bryan. **Preparado não significa integrado nem validado em interface.** Base inicial de 03/11/2026: `dev` em `a47854b`, `main` em `ffd68fd`. Em 04/11, o #68 entrou por merge commit `edece90` na `dev`; `main` preservada. Reconfira no GitHub antes de agir. Não há autorização para promover à `main`, dispensar revisão ou executar chamadas reais neste roteiro.

## 1. Integrar por etapas verificáveis

Cada PR precisa de revisão do outro integrante no head atual e CI verde. Atualizar uma base invalida a evidência de teste da composição anterior: conferir diff, resolver conflitos, executar verificações e revisar o novo head. Usar merge commit exclusivamente em `dev`. Não usar squash, force push, reset nem excluir branches necessárias às pilhas.

| Grupo | Dependência e atenção na integração |
| --- | --- |
| #90, #91, #92, #93 | Correções de matrícula confirmada, entrada/arquivamento, primeiro envio e JSON. São recortes separados; nenhum dos quatro foi mesclado na conferência. |
| #56 → #79 → #82 → #83/#84/#85 | Backend #90 antes do cliente #56. Revisar a correção `129678a`. Depois de cada pai integrado, trocar a base do próximo para `dev`, atualizar a branch com cuidado e exigir CI; os três últimos são irmãos, não uma sequência entre si. Preservar a rota OCR ao conciliar imports em AppRoutes. |
| #94 e #102 | Feedback indisponível e trechos publicados alteram o mesmo fluxo. Preservar distinção entre redação alheia/inexistente e feedback próprio indisponível, além da seleção pública sem análise privada. #102 depende da interface/cores #44 do Lucas para o aceite visual. |
| #97 → #116 → #117 | Schema/endpoints de notificações antes dos gatilhos. #116 inclui pré-requisitos #90/#91 reaplicados localmente: preservar as duas correções ao conciliar. #114 deve entrar antes do #117, que reaplica seus testes históricos. Reavaliar possíveis add/add, limpeza de FKs e ordem de locks, sem descartar um lado. |
| #95, #96, #98, #99 | Reabertura, conta/senha e contagem de entregas. Conferir limpeza das notificações nas fixtures de reabertura após #97. Interfaces, AuthProvider e os dois contadores do professor continuam com Lucas. |
| #101 e #103 | Consolidação Gemini e prompt v4. Preservar também normalização do parser do #93 no error-handler. O #70 é comparação, não uma camada a mesclar sobre #101; não encerrar #36 apenas por retirar repetições do SDK. |
| #107, #109, #110 | Dependências aprovadas separadamente. Conciliar manifests e regenerar apenas o lock necessário com as versões aprovadas, revisar o diff, repetir instalação/auditoria/testes na árvore conjunta. Não somar resultados de auditorias de branches isoladas. Repetir SSR da #101 com o Vite da #110. |
| #111, #113 e este guia | Observabilidade local, preparação acadêmica e entrega. Conciliar links/README sem apresentar guias como recursos já integrados. |
| #68 e #78 | #68 corrigiu prazo vencido inalterado/segundos no head 0b7368e e recebeu aprovação técnica em 04/11: 21 específicos, 82 testes do head e 110 da composição com dev, lint/build e CI verdes. O merge edece90 foi confirmado depois de uma resposta 502 do endpoint REST; a árvore é idêntica à composição testada cb02f51. Não repetir a operação por causa da resposta de erro. #78 foi ajustado para preservar claro/manual, mas o head c829336 recebeu solicitação de correção por lançar SecurityError ao acessar o getter localStorage fora do try. |

Revisão incremental de 04/11: #82 (`31bf4e5`) e #83 (`9d5df81`) receberam solicitação de mudanças por ocultar/bloquear propostas ativas vencidas ainda pendentes. A entrega com atraso já é permitida: alinhar hook/atalhos ao painel e manter rascunho vencido da turma atual editável, sem liberar arquivadas/já enviadas. #84 repete a seleção de atalho e recebeu aviso de integração; #85 herda o hook da #82. Correções e novas revisões continuam com Lucas. O #79 teve apenas revisão estática do recorte, sem novo bloqueio identificado; não equivale a aceite visual ou CI da composição.

#61, #63 e #68 estão em `dev`. As dependências da tabela não substituem a revisão técnica de cada diff. As URLs são `https://github.com/bryandarvel/lexis/pull/NUMERO`.

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
$env:TEST_DATABASE_URL = ($linhaBancoAceite -replace '^TEST_DATABASE_URL=', '').Trim().Trim('"').Trim("'")
npm.cmd --prefix e2e run test:guards
npm.cmd --prefix e2e run db:prepare
npm.cmd --prefix e2e run test:backend
```

`db:prepare` recusa URL remota/banco de desenvolvimento, gera o Client, confirma `SELECT DATABASE()` e executa `migrate deploy` somente em `lexis_test`. Não usa reset/drop/seed/shadow para aplicar migrations. `test:backend` usa processo filho, configura `NODE_ENV=test`, credenciais efêmeras e envio desativado; o preload bloqueia fetch externo não simulado. Não substitua esse destino pelo banco de demonstração para conseguir passar testes. Feche o terminal de teste antes de iniciar a demonstração.

O pacote E2E tem cenários antigos que precisam ser adaptados pelo Lucas na #66. Só depois da base integrada, cenários revisados e portas 3100/5180 livres:

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
| Sessão e #71/#49 | Login por papel, reload/refresh, logout; nome atualizado; senha trocada mantém sessão atual e revoga sessões antigas. OCR é descartado na troca efetiva de usuário, preservado na reautenticação da mesma conta. Sem senha/token/texto integral da redação em armazenamento local; preservar o rascunho privado da correção docente conforme o contrato existente. |
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
