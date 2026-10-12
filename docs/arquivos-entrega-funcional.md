# Arquivos da entrega funcional

Inventário local em 12/10/2026, originalmente na branch `feat/bryan-frontend`. Inclui alterações visuais já existentes antes desta meta e alterações técnicas desta entrega. A lista não significa que cada diferença foi criada agora. Após autorização explícita, o versionamento passou para `feat/20-entrega-funcional`, vinculada à [Issue #20](https://github.com/bryandarvel/lexis/issues/20). PR e merge para `dev` serão tratados em uma etapa posterior; `main` e os PRs do Lucas não fazem parte dessa operação.

## Modificados em relação ao HEAD

- `README.md`
- `backend/.env.example`
- `backend/package-lock.json`
- `backend/prisma/schema.prisma`
- `backend/scripts/process-email-notifications.js`
- `backend/src/app.js`
- `backend/src/config/env.js`
- `backend/src/config/prisma.js`
- `backend/src/middlewares/auth-rate-limiters.js`
- `backend/src/middlewares/authenticate-access-token.js`
- `backend/src/middlewares/error-handler.js`
- `backend/src/modules/auth/auth-token.service.js`
- `backend/src/modules/auth/auth.repository.js`
- `backend/src/modules/auth/auth.routes.js`
- `backend/src/modules/auth/auth.schemas.js`
- `backend/src/modules/auth/auth.service.js`
- `backend/src/modules/avaliacao-ia/analise-ia.routes.js`
- `backend/src/modules/feedbacks/feedbacks.routes.js`
- `backend/src/modules/notificacoes/notificacoes-email.service.js`
- `backend/src/modules/notificacoes/notificacoes.routes.js`
- `backend/src/modules/temas/temas.competencia-dois.js`
- `backend/src/modules/temas/temas.repository.js`
- `backend/src/modules/temas/temas.routes.js`
- `backend/src/modules/temas/temas.schemas.js`
- `backend/tests/integration/analise-ia-route.test.js`
- `backend/tests/integration/feedbacks-route.test.js`
- `backend/tests/integration/notificacoes-route.test.js`
- `backend/tests/integration/redacoes-aluno-route.test.js`
- `backend/tests/integration/redacoes-ocr-route.test.js`
- `backend/tests/integration/redacoes-professor-route.test.js`
- `backend/tests/integration/temas-aluno-route.test.js`
- `backend/tests/integration/temas-professor-route.test.js`
- `backend/tests/unit/authenticate-access-token.test.js`
- `backend/tests/unit/notificacoes-email.service.test.js`
- `docs/seguranca-dependencias.md`
- `frontend/package-lock.json`
- `frontend/src/components/auth/AuthNotice.jsx`
- `frontend/src/components/auth/AuthShell.jsx`
- `frontend/src/components/correction/AnalysisPanel.jsx`
- `frontend/src/components/correction/CriterionComments.jsx`
- `frontend/src/components/layout/AppHeader.jsx`
- `frontend/src/components/professor/CriterionDialog.jsx`
- `frontend/src/components/professor/criterion-dialog.css`
- `frontend/src/index.css`
- `frontend/src/pages/aluno/AlunoRedacaoPage.jsx`
- `frontend/src/pages/auth/LoginPage.jsx`
- `frontend/src/pages/auth/login.css`
- `frontend/src/pages/professor/ProfessorNovoTemaPage.jsx`
- `frontend/src/pages/professor/ProfessorRedacaoPage.jsx`
- `frontend/src/pages/professor/professor-correction.css`
- `frontend/src/pages/professor/professor-dashboard.css`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/services/analises-ia.js`
- `frontend/src/services/redacoes.js`
- `frontend/src/utils/essay-editor.js`
- `frontend/src/utils/professor-correction.js`
- `frontend/src/utils/topic-form.js`
- `frontend/tests/essay-editor.test.js`
- `frontend/tests/professor-correction.test.js`
- `frontend/tests/topic-form.test.js`

## Arquivos novos nesta entrega

- `backend/prisma/migrations/20261011000100_recuperacao_senha/migration.sql`
- `backend/src/middlewares/request-observability.js`
- `backend/src/modules/auth/password-recovery.controller.js`
- `backend/src/modules/auth/password-recovery.repository.js`
- `backend/src/modules/auth/password-recovery.service.js`
- `backend/src/utils/operational-log.js`
- `backend/tests/helpers/auth.js`
- `backend/tests/integration/password-recovery.test.js`
- `backend/tests/unit/operational-log.test.js`
- `backend/tests/unit/password-recovery.test.js`
- `backend/tests/unit/temas.schemas.test.js`
- `docs/arquivos-entrega-funcional.md`
- `docs/entrega-funcional.md`
- `docs/operacao-email.md`
- `docs/protocolo-academico-ia.md`
- `frontend/src/pages/auth/RedefinirSenhaPage.jsx`
- `frontend/src/services/password-recovery.js`
- `frontend/src/utils/external-request.js`
- `frontend/src/utils/ocr-upload.js`
- `frontend/src/utils/password-recovery.js`
- `frontend/tests/external-request.test.js`
- `frontend/tests/ocr-upload.test.js`
- `frontend/tests/password-recovery.test.js`

## Artefatos locais de evidência

`output/evidencias/` contém a imagem fictícia do OCR, seu gerador e screenshots dos testes. `backend/output/ai-evaluation/` contém os relatórios da fixture técnica. São artefatos ignorados pelo Git. Arquivos `.env`, clientes gerados e dependências locais não entram no inventário de commit.

## Divisão sugerida para revisão humana

1. Critérios fixos: schemas/repository, contrato OpenAPI, modelo canônico e fixtures/testes de propostas e redações.
2. Recuperação: migration/schema, autenticação e sessões, serviço/fila, telas/rotas, testes e configuração de exemplo.
3. Verificação e qualidade: prazos de IA/OCR, consulta de resultado, contraste, registros operacionais e testes correspondentes.
4. Dependências: lockfiles e revisão de alertas.
5. Documentação: configuração, operação de e-mail, protocolo acadêmico e relatório de evidências.

Como alguns arquivos cruzam grupos e contêm mudanças preexistentes, revise o diff por trecho antes de preparar commits. Use somente caminhos explícitos, confira `git diff --staged` e vincule a Issue #20. A separação de commits não modifica o escopo dos arquivos inventariados.

## Ajustes adicionais ao combinar com a dev

Na integração posterior, foram ajustados `backend/src/modules/desempenho/desempenho.routes.js`, `backend/tests/integration/desempenho-route.test.js` e `backend/tests/integration/desempenho-aluno-route.test.js` para compatibilidade com a autenticação e os critérios da entrega. Foram atualizados `CONTRIBUTING.md`, `README.md` e este relatório/inventário; foi criado `docs/atualizacao-dev.md`. Os demais arquivos do painel do Lucas chegaram pela integração da dev e foram preservados, não recriados.
