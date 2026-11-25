# B35 — regressões do comportamento atual

Issue #30. Base `dev`: `2e6a2e6`. Branch `test/30-regressoes-dominio`.

## Cobertura orientada a riscos

| Regra | Cobertura existente | Lacuna coberta nesta entrega |
|---|---|---|
| Papel, propriedade e vínculos | authenticate-access-token, authorize-roles; rotas de aluno/professor; backlog-essenciais | Outro professor/aluno não acessa feedback; outro aluno não lê notificação nem aciona OCR |
| Sessão e recuperação | auth-login/refresh/logout/me; password-recovery; operational-log | Nenhuma duplicação necessária; suítes existentes executadas |
| Matrícula, turma e proposta | turmas-aluno/professor; temas-aluno/professor; backlog-essenciais | Fixtures usam cadastro, login, turma e matrícula HTTP reais |
| Rascunho, revisão OCR, envio imutável | redacoes-aluno/ocr; upload-ocr-image; backlog-essenciais | Falhas OCR e LanguageTool não alteram o texto persistido nem bloqueiam envio digitado |
| Critérios fixos e congelamento | temas.competencia-dois; temas.schemas; backlog-essenciais | Critério de outro tema rejeitado sem criar feedback |
| IA somente consultiva | analise-ia.service/schemas/evaluation; backlog-essenciais | Reserva concorrente real com um vencedor; snapshot preservado; falha posterior mantém análise anterior e não cria nota |
| Feedback humano e histórico | feedbacks.service/competencias/schemas; feedbacks-route | Publicação v1 continua visível enquanto v2 é rascunho; republicação substitui v1; notas incompletas não publicam |
| Concorrência e notificações | notificacoes.service/route | Publicação concorrente gera uma versão e um aviso; repetição não duplica; leitura idempotente persiste no MySQL |
| Serviços externos | clientes Gemini/OCR/LanguageTool/Resend e serviços | Erro inesperado da IA persiste somente código seguro; nenhum provedor real é chamado |

Os nomes acima correspondem a arquivos em `backend/tests/unit/` e
`backend/tests/integration/`. A nova cobertura está em
`backend/tests/integration/domain-persistence.test.js`: sete testes, sem alteração de código de produção.

## Isolamento e verificação

Node 24; MySQL 8.4 local. O teste confere host loopback, nome
`lexis_test` e `SELECT DATABASE()` antes de escrever. Contas e conteúdo
são fictícios. Limpeza limitada aos IDs criados, sem reset do banco ou seed
de desenvolvimento. Auth, repositories e persistência são reais; somente
os provedores externos são simulados.

Comandos executados a partir de `backend/`, com configuração local ignorada:

- `npm.cmd ci` e `npx.cmd prisma generate --no-hints`: concluídos.
- `npx.cmd cross-env NODE_ENV=test node --test --test-concurrency=1 tests/integration/domain-persistence.test.js`: 7/7 passaram.
- `npm.cmd run lint`: passou.
- `npm.cmd test`: 279 testes, 59 suítes, 279 passaram; zero falhas, cancelados e ignorados (89.853 ms).
- `git diff --check`: passou; repetir ao preparar o commit.

Não há novo requisito de interface, biblioteca, migration ou contrato.
As verificações foram realizadas no checkout independente, ainda com Prisma
7.9.1 da base. B36 atualiza para 7.10.0; após integrar os PRs na `dev`,
reexecutar a suíte combinada. B30 tem seus testes de fila em outra branch.
Não se reivindica auditoria WCAG completa, avaliação acadêmica da IA,
envio real de e-mail ou aceite na máquina do Lucas.

## Preparação para PR (nenhuma ação de publicação executada)

Commit sugerido: `test: cobre regressões de persistência e isolamento do domínio`.

Título: `test: amplia cobertura do comportamento atual B35`.

Descrição:

> Closes #30
>
> Acrescenta sete regressões com MySQL real para histórico/publicação
> concorrente de feedback, isolamento de notificações, concorrência e
> histórico consultivo da IA e preservação do rascunho em falhas externas.
> Fixtures e limpeza restritas ao banco local de teste. Nenhum código
> produtivo, layout, dependência ou CI alterado.
>
> Verificação: lint; suíte focada 7/7; backend completo 279/279.
> Base do PR: dev. Repetir testes após combinação com B36/B30.
