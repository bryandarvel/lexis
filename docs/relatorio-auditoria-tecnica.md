# Relatório de conclusão da auditoria técnica — LÉXIS

Data da validação: 5 de setembro de 2026

Branch local: `feat/14-concluir-lacunas-tecnicas`

Base: `f28b5b3` — merge do PR #12

Issue de acompanhamento: #14

## 1. Resumo executivo

As lacunas técnicas verificáveis das imagens de auditoria foram tratadas no repositório local. O fluxo do aluno agora inclui produção, salvamento, OCR com revisão explícita e envio definitivo; a análise de IA fornece evidências localizáveis e destacáveis com fallback seguro; os três critérios da Competência II existem como modelo editável; o LanguageTool é opcional e não bloqueante; há seed idempotente, harness reprodutível para avaliação da IA e interface de notificações.

O projeto foi validado com lint, testes, build, migrações e seed em banco limpo, inicialização local e navegação visual pelos fluxos principais. Permanecem como dependências externas a avaliação acadêmica da IA com corpus humano autorizado, chamadas reais dos serviços de IA, OCR e LanguageTool, entrega real de e-mail e correções no documento acadêmico/slides fora deste repositório.

Nenhum resultado científico foi inventado. Nenhum push, merge remoto, Pull Request, release ou deploy foi realizado.

Ao término da validação, API, frontend e MySQL local foram encerrados; o volume persistente do banco foi preservado. As portas 3000, 5173 e 3307 não permaneceram em escuta.

## 2. Estado das Etapas 0 a 11

| Etapa | Resultado | Evidência principal | Estado |
| --- | --- | --- | --- |
| 0 — baseline e auditoria | Estado Git, CI, documentação, código, testes e volumes recalculados | `git status`, histórico, Issue #14 e execução inicial | Concluída |
| 1 — integração anterior | PRs #8 a #12 já estavam incorporados em `main`; não houve duplicação | HEAD `f28b5b3` | Concluída |
| 2 — redação do aluno | Editor acessível, autosave no servidor, contador, OCR revisável e envio irreversível | `AlunoRedacaoPage.jsx`, rotas e testes de redação/OCR | Concluída |
| 3 — evidências da IA | Contrato `trecho/inicio/fim`, validação, fallback, ambiguidade e `<mark>` seguro | schemas, prompt v3, `EssayEvidenceText.jsx` e testes | Concluída |
| 4 — Competência II | Modelo versionado e editável: Legitimação, Pertinência e Uso produtivo | `temas.competencia-dois.js`, tela de novo tema e testes | Concluída |
| 5 — LanguageTool | Integração manual, opcional, com timeout, rate limit e fail-open | cliente, endpoint, interface, mocks e documentação | Concluída sem chamada externa |
| 6 — seed Prisma | Cenário fictício determinístico, idempotente e verificável | `prisma/seed.js`, `db:seed`, `db:seed:verify` | Concluída |
| 7 — avaliação da IA | Harness em fixture e modo real protegido contra custo acidental | `evaluate-ai.js`, fixture e documentação | Concluída em fixture |
| 8 — qualidade e CI | Teste do frontend no CI, OpenAPI corrigido, `/health` testado e auditoria de dependências | CI, testes Swagger e documento de segurança | Concluída com ressalva de dependências transitivas |
| 9 — notificações | Contador, central, leitura e navegação ao feedback | página, serviços, eventos e testes | Concluída |
| 10 — documentação | README, ambiente, segurança, avaliação da IA e este relatório atualizados | arquivos Markdown e `.env.example` | Concluída |
| 11 — validação integral | Suites, build, banco limpo, seed, servidores e fluxos visuais aprovados | resultados registrados neste relatório | Concluída |

## 3. Revisão das afirmações das imagens

| Hipótese das imagens | Classificação inicial | Estado após o trabalho | Evidência |
| --- | --- | --- | --- |
| A `main` estava atrás de branches com autenticação, design, autosave e reautenticação | Desatualizada | Os PRs #8–#12 já estavam integrados antes desta tarefa | HEAD `f28b5b3` |
| O aluno não conseguia escrever nem enviar pela interface | Confirmada | Corrigida e validada de ponta a ponta | rota `/aluno/temas/:temaId/redacao`, editor e teste visual |
| A IA identificava evidências, mas não destacava no texto | Confirmada | Corrigida com offsets validados, fallback e marcação acessível | prompt v3, schema e `EssayEvidenceText.jsx` |
| Os critérios C2 não existiam como modelo pré-carregado | Confirmada | Corrigida sem transformá-los em regra global | modelo C2 versionado e formulário editável |
| O LanguageTool não existia no código | Confirmada | Corrigida como integração opcional e fail-open | cliente isolado, endpoint, UI e mocks |
| Não existia seed Prisma | Confirmada | Corrigida e testada duas vezes e em banco limpo | scripts de seed e verificação |
| Não existia harness de avaliação da IA | Confirmada | Corrigida; avaliação acadêmica real permanece externa | harness, fixture sintética e relatório JSON/Markdown |
| O CI do frontend não executava testes | Confirmada | Corrigida | `.github/workflows/ci.yml` |
| `@eenapi` deixava `/health` fora do Swagger | Confirmada | Corrigida e coberta por teste | `backend/src/app.js` e `swagger.test.js` |
| Havia arquivo de teste com nome incorreto | Confirmada | Corrigida por renomeação | `authenticate-access-token.test.js` |
| Pastas aparentemente vazias deveriam ser removidas | Não confirmada como defeito | Não removidas: não houve evidência de impacto e a instrução vedava remoção por aparência | inspeção do repositório |
| O frontend não possuía interface de notificações | Confirmada | Corrigida e validada visualmente | `/aluno/notificacoes` e sino no cabeçalho |
| Contagens antigas: backend 9.347 linhas, frontend 6.055 linhas e 216 testes | Desatualizada | Recalculadas após a implementação | 64 arquivos/9.146 linhas em `backend/src`; 59 arquivos/8.163 linhas em `frontend/src`; backend com 233 testes |

## 4. Matriz de objetivos e requisitos do TCC

| Objetivo ou requisito do TCC | Evidência no código | Teste | Estado | Observação |
| --- | --- | --- | --- | --- |
| Autenticação segura e separação de papéis | módulos `auth`, guards e middlewares | suites unitárias e de integração do backend | implementado e testado | JWT curto, refresh rotacionado e reautenticação já existiam |
| Aluno autorizado e matriculado acessa o tema | serviços e rotas de redações/temas | integração e fluxo visual | implementado e testado | acesso protegido por papel e matrícula |
| Produzir, salvar e enviar redação | `AlunoRedacaoPage.jsx`, `redacoes.js`, backend de redações | testes unitários/integração e fluxo visual | implementado e testado | texto fica somente leitura após o envio |
| Preservar rascunho durante reautenticação | `RouteGuard.jsx` e fluxo de rascunho | testes do frontend/backend existentes | implementado e testado | não duplica o texto da redação em `localStorage` |
| Digitalizar imagem por OCR | endpoint OCR e seção “Digitalizar redação” | mock de integração e interface | implementado sem validação externa | chamada real depende da chave OCR.space |
| Revisar OCR antes de aceitar | confirmação explícita e `ocrRevisadoEm` | teste prova que extração não sobrescreve o rascunho | implementado e testado | impede substituição silenciosa |
| Revisão gramatical e ortográfica | cliente LanguageTool e ação manual no editor | mocks de sucesso, erro e fail-open | implementado sem validação externa | desabilitado por padrão; serviço local recomendado |
| Identificar repertório por IA | módulo `avaliacao-ia` e prompt v3 | testes de schema/serviço e fixture | implementado sem validação externa | execução real depende de Gemini |
| Destacar trechos identificados | offsets, fallback textual e `<mark>` React | testes de localização, duplicidade e UI utilitária | implementado e testado | não utiliza HTML injetado |
| Critérios C2 coerentes | modelo `competencia-2-repertorio-v1` | testes unitários e tela validada | implementado e testado | modelo editável; não substitui as cinco competências ENEM |
| Autonomia do professor nos critérios | criação/edição/reordenação antes do bloqueio | testes de modelo e fluxo visual | implementado e testado | critérios são congelados após a primeira entrega |
| Análise consultiva, decisão humana | `AnalysisPanel.jsx` e `FeedbackEditor.jsx` | fluxo visual da correção | implementado e testado | IA não atribui nota final |
| Avaliação pelas cinco competências ENEM | modelo Prisma, serviço e editor de feedback | testes de schema/serviço | implementado e testado | cada competência recebe valor válido; total até 1.000 |
| Publicar feedback e avisar aluno | backend de feedback/notificação e frontend | integração, testes utilitários e fluxo visual | implementado e testado | navegação do aviso ao feedback validada |
| Envio de e-mail | fila/integração já existente | testes preexistentes | implementado sem validação externa | entrega real depende de Resend e domínio/configuração |
| Cenário demonstrável reproduzível | seed Prisma | execução repetida, verificador e banco limpo | implementado e testado | somente dados fictícios |
| Comparar versões da análise de IA | harness de avaliação | modo fixture executado | prototipado | estrutura pronta; comparação acadêmica requer corpus e avaliações humanas |
| Validar academicamente o sistema de IA | documentação de metodologia | não executado | trabalho futuro | requer corpus licenciado/consentido e protocolo humano |
| Responsividade | layouts em 1, 2 e 3 colunas e componentes responsivos | inspeção em desktop e viewport móvel | implementado e testado | correção usa bottom sheet em telas pequenas |
| Acessibilidade por teclado e foco visível | elementos semânticos e regra global `:focus-visible` | navegação Tab manual | implementado e testado | rótulos e estados foram expostos à árvore de acessibilidade |
| Preferência por movimento reduzido | CSS e hook GSAP | inspeção de código e suites do frontend | implementado e testado | transições/animações são reduzidas globalmente |
| Contraste da identidade clara/escura | tokens de cor e superfícies em `index.css` | cálculo WCAG de pares representativos e verificação visual | implementado e testado | o texto do botão primário escuro foi corrigido após a amostragem detectar 3,80:1; auditoria automatizada de todas as combinações ainda é recomendada |
| Observabilidade com Sentry/OpenTelemetry | apenas planejamento anterior | não executado | documentado, mas ausente | fora das lacunas priorizadas desta Issue e exigiria decisões de serviço/configuração |

## 5. Arquivos criados, modificados ou removidos

### Criados

- Backend: fixture e harness de avaliação da IA; seed e verificador; migração de notas por competências; integração e rate limiter do LanguageTool; módulos auxiliares de evidências, competências ENEM e modelo C2; testes novos de IA, autenticação renomeada, feedback, LanguageTool, Swagger e C2.
- Frontend: `EssayEvidenceText.jsx`; páginas `AlunoRedacaoPage.jsx`, `AlunoNotificacoesPage.jsx` e `ProfessorNovoTemaPage.jsx`; constante de competências ENEM; serviços de notificações; utilitários e testes de evidência, editor, notificações e formulário de tema.
- Documentação: `docs/avaliacao-ia.md`, `docs/seguranca-dependencias.md` e este relatório.

### Modificados

- CI, README e CONTRIBUTING.
- Configuração do backend, Prisma, OpenAPI, análise de IA, feedbacks, redações e temas, além de seus testes.
- Lockfiles e scripts NPM necessários às verificações e ao seed.
- Rotas, serviços, layouts, páginas, componentes, animações e tokens visuais do frontend.

### Removidos ou renomeados

- `backend/tests/unit/authemticate-acess-token.test.js` foi substituído por `backend/tests/unit/authenticate-access-token.test.js` para corrigir o nome. Nenhum diretório foi removido apenas por parecer vazio.

O `git status` deve ser consultado antes de preparar um commit, pois o worktree já continha alterações não commitadas da Issue #13 quando esta branch foi criada. A lista acima descreve o estado final do worktree, não atribuição exclusiva de autoria a esta auditoria.

## 6. Migrações

- A migração `20260901180000_feedback_competencias_enem` adiciona as notas das cinco competências e a nota total ao feedback.
- Não foi criada migração para evidências da IA: o resultado já é armazenado como JSON e aceita com segurança o contrato `trecho/inicio/fim`.
- As migrações foram aplicadas do zero em uma instância MySQL temporária, seguidas de seed e verificação. O contêiner temporário foi encerrado e removido após o teste.

## 7. Branches e commits locais

- Branch criada: `feat/14-concluir-lacunas-tecnicas`.
- Base: `f28b5b3`.
- Commits criados nesta execução: nenhum. As alterações permanecem no worktree para revisão e autorização explícita antes de qualquer commit.

## 8. Testes e verificações executados

| Verificação | Resultado |
| --- | --- |
| Backend — `npm.cmd run lint` | aprovado |
| Backend — `npm.cmd test` | 233 testes, 54 suites, 0 falhas |
| Frontend — `npm.cmd run test` | 20 testes, 0 falhas |
| Frontend — `npm.cmd run lint` | aprovado, 0 avisos/erros |
| Frontend — `npm.cmd run build` | aprovado; bundle principal de aproximadamente 415 kB, sem alerta de 500 kB |
| Instalação limpa — backend e frontend | `npm ci` concluído; Prisma Client regenerado antes dos testes |
| Migrações em MySQL limpo | aprovadas |
| Seed repetido e verificador | aprovado, sem duplicação |
| Harness de IA em fixture | aprovado; saída JSON e Markdown local ignorada pelo Git |
| `git diff --check` | sem erro de whitespace; apenas avisos de conversão LF/CRLF |
| Auditoria NPM do frontend | 0 vulnerabilidades conhecidas |
| Auditoria NPM do backend | 6 vulnerabilidades transitivas remanescentes: 1 moderada e 5 altas |
| Varredura de segredos e artefatos rastreados | nenhum `.env`, segredo, `dist`, `coverage` ou `output` indevido encontrado |

A amostragem de contraste resultou em 16,19:1 para texto principal claro, 8,40:1 para texto secundário claro, 4,58:1 para foco/realce claro, 18,33:1 para texto principal escuro e 8,86:1 para texto secundário escuro. A combinação inicialmente insuficiente de texto branco com botão azul no tema escuro (3,80:1) foi substituída por texto `lexis-950`: 7,25:1 em repouso e 5,02:1 no hover.

As seis ocorrências do audit do backend chegam por dependências transitivas de Prisma/MySQL/MariaDB. A correção automática com `--force` propõe alteração principal potencialmente incompatível; por isso não foi aplicada. Detalhes e mitigação estão em `docs/seguranca-dependencias.md`.

## 9. Fluxos validados visualmente

- Tema claro padrão e troca manual para o tema escuro.
- Login como aluno fictício.
- Painel do aluno com tema e rascunho.
- Editor com critérios C2, contador, estado salvo, OCR e revisão linguística opcional.
- Salvamento manual com mensagem de sucesso.
- Confirmação de envio definitivo e bloqueio do editor após o envio.
- Central de notificações: uma notificação não lida, marcação como lida, contador atualizado para zero e navegação ao feedback de nota 850.
- Layout móvel do feedback em viewport de 390 × 844.
- Login como professora fictícia.
- Painel, turma, tema, critérios congelados e lista de entregas.
- Formulário de novo tema com C2 pré-carregada, editável, reordenável e removível.
- Correção de redação com evidência marcada no texto, análise consultiva e editor humano das cinco competências.
- Navegação por teclado: a tecla Tab levou foco ao primeiro link do cabeçalho, exposto corretamente pela árvore de acessibilidade.
- Não foram observados erros relevantes no console durante o fluxo de notificações/feedback; requisições relevantes responderam com sucesso no log da API.

## 10. Decisões técnicas e justificativas

- **OCR em duas fases:** extrair e revisar são ações diferentes. Isso preserva qualquer texto digitado e exige consentimento explícito antes de aceitar o OCR.
- **Evidência híbrida:** offsets válidos têm prioridade; busca textual corrige offset inválido somente quando há uma ocorrência única; duplicidades são sinalizadas como ambíguas e ausências como não localizadas.
- **Sem `dangerouslySetInnerHTML`:** os destaques são componentes React e carregam rótulo textual, não apenas cor.
- **C2 como modelo, não regra:** os três critérios agilizam a demonstração, mas o professor pode editar, reordenar, remover ou usar critérios próprios antes do bloqueio.
- **LanguageTool manual e fail-open:** evita transmitir o texto sem uma ação clara e nunca impede salvar ou enviar se o serviço falhar.
- **Fixture antes de serviço externo:** testes e harness são determinísticos e não geram custo. O modo real exige variável de habilitação, confirmação na linha de comando e limite máximo de casos.
- **JSON sem migração para evidências:** o campo existente suporta a evolução do contrato sem alteração estrutural do banco.
- **Dependências sem `--force`:** não foi aceita uma troca principal do Prisma apenas para silenciar o audit; o risco foi documentado para atualização controlada posterior.

## 11. Correções exatas para o TCC e os slides

Como o documento acadêmico original não está neste repositório, aplicar externamente as seguintes correções:

1. Descrever a arquitetura real como React + Vite + Tailwind CSS no cliente; Node.js + Express + JWT + bcrypt no servidor; Prisma + MySQL nos dados; Gemini, OCR.space, LanguageTool e Resend como integrações externas opcionais/configuráveis.
2. Diferenciar explicitamente as cinco competências do ENEM dos três critérios de repertório da Competência II: Legitimação, Pertinência e Uso produtivo.
3. Informar que os critérios C2 são um modelo pré-carregado e editável, não uma regra fixa global.
4. Atualizar o fluxo do aluno: rascunho no servidor, OCR em duas fases, revisão opcional do LanguageTool, confirmação de envio e texto imutável após a entrega.
5. Atualizar o fluxo do professor: critérios congelados após a primeira entrega, análise consultiva, evidências destacadas e nota/feedback sob responsabilidade humana.
6. Explicar o contrato de evidência `trecho/inicio/fim`, validação de offsets, fallback textual, ambiguidade e ausência de HTML injetado.
7. Separar claramente teste de integração, demonstração manual, avaliação do prompt, avaliação do sistema de IA e validação acadêmica.
8. Não apresentar a fixture sintética nem duas redações manuais como evidência científica de acurácia.
9. Registrar que a avaliação acadêmica com corpus de referência ainda depende de seleção/licença do corpus e de avaliações humanas. O Essay-BR pode apoiar comparação de notas/competências, mas não fornece sozinho o gabarito de spans de evidência exigido pelo LÉXIS.
10. Substituir números antigos do projeto pelos números verificados na versão usada na apresentação; não congelar contagens de arquivos, linhas ou testes sem indicar commit e data.
11. Mostrar o ciclo completo “professor publica feedback → notificação é criada → aluno abre o aviso → feedback é marcado como consultado”.
12. Apresentar LanguageTool, Gemini, OCR.space e Resend como dependências externas, com modo local/fixture e limitações de credenciais, disponibilidade, privacidade e custo.
13. Corrigir o diagrama de dados para mostrar somente MySQL como banco efetivamente adotado, se essa continuar sendo a decisão do projeto.

## 12. Limitações externas e próximas ações recomendadas

1. Atualizar o TCC e os slides com a lista exata da seção anterior; isso evita apresentar arquitetura, fluxos ou resultados divergentes do sistema real.
2. Selecionar e documentar um corpus autorizado e montar o protocolo de avaliação humana; essa é a base necessária para qualquer afirmação acadêmica sobre a IA.
3. Validar OCR.space, Gemini, LanguageTool e Resend em ambiente de demonstração, usando credenciais próprias e somente dados fictícios.
4. Executar um lote pequeno do harness em modo real, com credencial, orçamento e autorização definidos, comparando pelo menos duas versões identificadas do prompt.
5. Executar auditoria automatizada WCAG de contraste e acessibilidade em todas as rotas antes da banca.
6. Revisar o worktree, separar alterações preexistentes da Issue #13 quando necessário e solicitar autorização antes de commits, push ou PR.
7. Planejar atualização controlada das dependências transitivas do backend, sem usar `npm audit fix --force` automaticamente.
8. Configurar domínio/remetente do Resend caso a demonstração precise enviar para destinatários diferentes da conta autorizada.

## 13. Estado remoto

Não foi realizado push, merge remoto na `main`, Pull Request, release ou deploy. Todo o trabalho desta auditoria permanece exclusivamente na branch e no worktree locais.
