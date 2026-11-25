# Aceite B01 a B04

Registro de 13/10/2026. Escopo: acesso às propostas do aluno, prazo vencido, código da turma fictícia e aceite integrado. A implementação das telas B05 a B20 continua fora desta entrega.

## Comportamento implementado

- O painel mostra todas as propostas ativas retornadas pela API da turma atual, mesmo sem redação iniciada.
- A lista mostra prazo, situação e ação: escrever, continuar rascunho, acompanhar envio ou ver feedback publicado.
- Uma proposta vencida continua acessível. O aviso explica que o envio será registrado com atraso; a regra do servidor não mudou.
- O destaque e o atalho lateral priorizam a proposta pendente com prazo aberto mais próximo. Se só houver pendentes vencidas, oferecem uma delas, sem esconder a lista completa.
- Redações enviadas ou avaliadas não oferecem novo envio. Propostas arquivadas não entram na lista de propostas disponíveis.
- Carregamento, vazio e falha de consulta continuam explícitos. A situação depende de carregar tanto propostas quanto redações.

A função `listarPropostasDoAluno` centraliza a combinação entre temas e redações. Ao redesenhar o painel, preserve esse comportamento. O backend já restringe o acesso pela matrícula ativa, turma e papel; o frontend não substitui essas verificações.

## Código da demonstração (B04)

Novas turmas do seed usam `LEXDEM26`, aceito pelo schema real de matrícula. O seed identifica a turma pelo ID fixo, e o verificador aceita códigos válidos já regenerados.

Para um banco já utilizado, **não repita o seed** apenas para trocar o código. Ele redefine contas e trabalhos fictícios. A atualização específica faz somente uma conferência por padrão:

```powershell
# Dentro de backend/
npm.cmd run db:demo:code
```

Após aprovar a alteração local:

```powershell
npm.cmd run db:demo:code -- --apply
```

O comando aceita apenas banco local `lexis` ou `lexis_test`, fora de produção. Verifica ID da turma, ID/e-mail/papel do professor fictício, código legado e conflitos. A escrita condicional altera apenas `codigoAcesso`; códigos válidos existentes são preservados. Não cria turma ausente e não modifica contas, senhas, matrículas, propostas ou redações. O timestamp automático de atualização da turma pode acompanhar a mudança.

Nesta máquina, o usuário autorizou a aplicação específica. O comando retornou `CORRIGIDO`, e a nova conferência retornou `JA_VALIDO`.

## Verificações executadas nesta máquina

| Verificação | Resultado |
| --- | --- |
| Frontend: `npm.cmd test` | 67 testes aprovados, zero falhas e cancelamentos |
| Frontend: `npm.cmd run build` | Aprovado |
| Frontend e backend: `npm.cmd run lint` | Aprovados |
| Backend: `npm.cmd test` | 272 testes aprovados em 59 suites, zero falhas e cancelamentos |
| Testes focados de B01-B04 | 15 aprovados |
| Código fictício | Corrigido com autorização e conferido novamente |
| `npm.cmd run db:seed:verify` | Aprovado, sem executar novamente o seed |

O teste `backlog-essenciais.test.js` percorre cadastro/login fictícios, turma, matrícula, proposta vencida, OCR, revisão, envio atrasado, imutabilidade, análise consultiva, rascunho humano, publicação, notificação e leitura do feedback pelo aluno. Também bloqueia a leitura por outro aluno. Autenticação, regras e MySQL são reais; somente as respostas externas de OCR e geração de IA são fixtures. Não envia e-mails nem comprova disponibilidade atual dos provedores reais.

Os testes criam e removem apenas seus próprios dados em `lexis_test`, confirmado antes da execução.

## Conferência no navegador

O aceite usa Chrome, frontend temporário na porta 5174 e API temporária na porta 3002, com banco `lexis_test`, contas novas fictícias e provedores simulados. Não altera arquivos `.env` nem dados das contas usuais.

Já observado: três propostas não iniciadas na lista, abertura da vencida, revisão explícita do OCR, rascunho salvo, retorno ao painel com ação Continuar e envio definitivo confirmado pelo usuário. Depois do envio, a lista oferece Acompanhar e o editor fica somente para leitura.

A análise fictícia foi concluída mantendo as cinco notas vazias. Depois, foram preenchidos comentários humanos e notas 160/120/160/160/160, total 760, salvos como rascunho e publicados com confirmação manual do usuário. O aluno acessou os comentários e a nota publicada pela ação Ver feedback na lista. A notificação também abriu a correção e passou de um aviso não lido para zero. O professor identificou a entrega como OCR e atrasada. Não houve erros ou avisos registrados no console da aba ao final.

A seleção da imagem e as confirmações nativas de envio/publicação exigiram ação manual devido ao bloqueio da extensão. A análise e o OCR deste servidor eram fixtures; não representam novas chamadas reais aos provedores. O teste integrado automatizado comprovou, adicionalmente, que o rascunho humano não é visível ao aluno e que outro aluno não lê o feedback publicado.

Os dois servidores temporários foram encerrados e as quatro contas e duas turmas fictícias criadas nas duas inicializações de teste foram removidas, com seus próprios registros relacionados, somente de `lexis_test`. Os dados usados habitualmente em `lexis` foram preservados, exceto pelo código fictício cuja troca foi autorizada.

Evidências locais ficam em `output/evidencias/`, ignoradas pelo Git.

- `b01-b02-propostas.jpg`: todas as propostas, inclusive vencida sem rascunho.
- `b01-b02-propostas-corrigida.jpg`: situação final e link para o feedback.
- `b03-ocr-revisao.jpg`, `b03-envio.jpg`: revisão e envio.
- `b03-correcao-rascunho.jpg`, `b03-publicacao.jpg`, `b03-feedback.jpg`: revisão humana e leitura pelo aluno.

## Roteiro para a máquina do Lucas

Esta entrega está vinculada à Issue #26 e à branch `feat/26-propostas-aluno`, com destino de PR para `dev`. Enquanto o PR não for integrado, `git pull origin dev` não incluirá estas alterações. O merge exige aprovação específica. Lucas também pode validar a branch do PR antes do merge, preservando seu trabalho local.

1. Antes de atualizar, rode `git status` na raiz. Se houver trabalho local, preserve-o na branch da tarefa antes de trocar de branch; não descarte alterações para conseguir atualizar.
2. Quando a entrega estiver em `origin/dev` e a árvore estiver limpa, rode na raiz:

   ```powershell
   git switch dev
   git pull --ff-only origin dev
   ```

   Para testar a entrega antes do merge, com a árvore limpa, use a branch do PR:

   ```powershell
   git fetch origin
   git switch --track origin/feat/26-propostas-aluno
   ```

   Se essa branch já existir localmente, use `git switch feat/26-propostas-aluno` e `git pull --ff-only origin feat/26-propostas-aluno`. Isso não integra o trabalho do Lucas nem autoriza merge de PRs.

3. Instale pelos lockfiles nos pacotes correspondentes, nunca na raiz:

   ```powershell
   cd backend
   npm.cmd ci
   docker compose up -d
   docker compose ps
   npm.cmd run lint
   npm.cmd test
   ```

   Confirme que `TEST_DATABASE_URL` aponta para o banco local `lexis_test`, preparado com as migrations existentes. Esta entrega não adiciona migration nem dependência. Não copie `.env` ou segredos de outra pessoa.

   ```powershell
   cd ../frontend
   npm.cmd ci
   npm.cmd run lint
   npm.cmd test
   npm.cmd run build
   ```

4. Se a turma fictícia já existe, use `db:demo:code` para conferência e aplique a correção específica somente após aprovação nessa máquina. Não repita o seed sobre dados usados. Em ambiente novo e exclusivamente fictício, o seed pode preparar a demonstração conforme o README.
5. Inicie backend e frontend em terminais separados, com `npm.cmd run dev` dentro de cada pacote.
6. Use um aluno fictício ainda sem redação para cada proposta a testar. Entre na turma fictícia pelo código válido mostrado pelo professor.
7. Com o professor fictício, crie pelo menos duas propostas futuras. Confira se ambas aparecem ao aluno sem precisar iniciar rascunho.
8. Confira também uma proposta ativa vencida: o tema original da demonstração tem prazo em 10/10/2026. Use um aluno fictício que ainda não a tenha enviado. Não altere prazo de proposta real só para testar.
9. Abra a vencida, confira o aviso de atraso no painel, revise o texto digitado ou extraído por OCR, confirme a revisão e salve. Volte ao painel: deve aparecer Rascunho/Continuar.
10. Envie definitivamente. O editor deve bloquear edição, o painel deve mostrar Em correção/Acompanhar e o professor deve identificar o envio atrasado.
11. Na conta do professor responsável, solicite análise consultiva se a integração estiver configurada. Ela não deve preencher nota nem publicar feedback. Uma falha externa deve ser explícita e permitir continuar a correção humana.
12. Preencha notas e comentários humanos, salve o rascunho e confira que o aluno ainda não vê a correção. Publique conscientemente apenas o feedback fictício.
13. Volte ao aluno: confira notificação, feedback publicado e ação Ver feedback na proposta. Um aluno diferente não deve acessar essa correção.
14. Registre navegador, comandos executados, contagem final dos testes, passos aprovados e qualquer falha, sem enviar senhas, tokens, chaves ou redações reais.

Modelo de retorno:

```text
Máquina do Lucas:
- Backend lint/testes: resultado e quantidade
- Frontend lint/testes/build: resultado e quantidade
- Duas propostas não iniciadas acessíveis: passou/falhou
- Proposta vencida sem rascunho acessível: passou/falhou
- OCR, revisão e rascunho: passou/falhou
- Envio atrasado e edição bloqueada: passou/falhou
- Análise consultiva (ou erro externo controlado): resultado
- Rascunho humano privado, publicação e feedback: passou/falhou
- Notificação e isolamento entre alunos: passou/falhou
- Problema encontrado: passo e mensagem, sem dados sensíveis
```

## Gate de conclusão

B03 só estará concluído após a confirmação do aceite na máquina do Lucas. Testes automatizados, um ambiente local aprovado ou os testes de integrações realizados anteriormente não substituem essa confirmação. Commit, push, Issues, PR e merge continuam dependentes de autorização explícita. A `main` não participa desta etapa.
