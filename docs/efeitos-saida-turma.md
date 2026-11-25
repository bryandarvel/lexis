# Histórico após sair da turma — #55

Decisões do Bryan em 03/11/2026: preservar o desempenho de **todas as turmas**, com rótulo claro na interface, e avisar o professor dentro do sistema na saída voluntária, sem novo e-mail. Esta entrega reúne regressões de histórico e o gatilho transacional do aviso; não altera telas. O rótulo e a interface de notificações continuam com Lucas.

## Comportamento coberto

- Sair encerra a matrícula, não apaga a conta, rascunhos, redações, correções ou notificações. Sem matrícula ativa, a saída responde 404 ACTIVE_ENROLLMENT_NOT_FOUND e não altera matrícula de outra conta.
- Reentrar na mesma turma cria outro registro de matrícula e conserva o encerrado; não é uma duplicata a remover. O rascunho ainda não enviado pode ser retomado quando a matrícula volta a estar ativa. A redação enviada continua imutável.
- O aluno mantém leitura dos próprios textos e feedbacks publicados após sair/trocar de turma. Pode marcar uma notificação própria de feedback como lida. Outra conta não passa a ter acesso. “Lida” não demonstra, por si só, que o feedback foi consultado.
- A turma antiga deixa de permitir salvar/enviar na proposta ao aluno sem vínculo ativo; a leitura do rascunho próprio não concede permissão de escrita. Entrar em outra turma não altera isso.
- Ex-aluno deixa a listagem ativa do professor, mas as entregas enviadas permanecem no histórico do professor responsável; o rascunho privado não é promovido a entrega.
- O desempenho agrega publicações das turmas antigas e atual pelo aluno, sem contar uma correção outra vez por causa de nova matrícula. A interface deve explicar o escopo histórico, não sugerir que os números são exclusivos da turma atual.
- Arquivar a turma encerra matrículas e preserva leitura/histórico. Uma nova saída sem vínculo ativo é recusada, sem apagar a redação.

O [PR #90](https://github.com/bryandarvel/lexis/pull/90) trata a corrida da saída e o contrato obrigatório com ID da matrícula confirmada. Esta branch dependente incorpora esse pré-requisito, a ordem de locks do #91, o schema/endpoints do #97 e os avisos ao aluno do #116. As regressões históricas também existem separadamente no #114. Integre os pré-requisitos e atualize/revise o diff antes de mesclar esta entrega; nada aqui autoriza merge automático.

## Contrato do aviso de saída voluntária

`DELETE /api/turmas/minha-matricula` continua recebendo estritamente `{ "matriculaId": "UUID confirmado" }` e retornando `data.matricula` encerrada. O aluno é derivado da autenticação. O servidor bloqueia o usuário, confere a matrícula ativa confirmada e só cria a notificação depois de vencer o encerramento condicional, tudo na mesma transação.

- Destinatário: somente o professor responsável pela turma. Tipo: `ALUNO_SAIU_TURMA`. Título: “Aluno saiu da turma”. Mensagem identifica os nomes do aluno e da turma e explica a preservação do histórico; renderizar como texto, nunca HTML.
- `feedbackVersaoId`, `redacaoId`, `emailDestino` e `statusEmail` ficam nulos. O DTO também traz `feedbackVersao: null` e `redacao: null`. O cliente não deve abrir uma correção inexistente nem buscar análise de IA para esse evento.
- O aviso aparece em `GET /api/professor/notificacoes`, junto do contador de não lidas, e pode ser marcado por `PATCH /api/professor/notificacoes/:notificacaoId/lida`. Só o proprietário lê/marca; a primeira data de leitura é preservada.
- Confirmação antiga/de outra matrícula: 409 `ACTIVE_ENROLLMENT_CHANGED`, sem encerramento ou aviso. Sem vínculo ativo: 404 `ACTIVE_ENROLLMENT_NOT_FOUND`, sem aviso. Papel incorreto: 403. Corpo inválido: 422.
- Duas saídas simultâneas produzem um encerramento e um aviso. A segunda recebe 404. Falha de persistência do aviso desfaz o encerramento e retorna erro interno genérico; não fingir sucesso nem repetir automaticamente.
- Reentrada cria nova matrícula; uma saída posterior é outro evento legítimo. Desvinculação e arquivamento não fingem saída voluntária: seus avisos ao aluno são os tipos próprios da #64.
- Não há novo e-mail, worker, migration, endpoint genérico `/api/notificacoes` nem alteração dos eventos de feedback. A fila do #97 limita o envio aos tipos de feedback.

Os testes de `notificacoes-saida-turma.test.js` usam API e MySQL reais locais com contas fictícias. Só a falha de inserção é injetada para demonstrar rollback. Não fazem chamadas a provedores externos.

## Pendências explícitas

O merge depende dos pré-requisitos e CI verde no head atualizado; a exceção de revisão autorizada por Bryan para este lote está registrada no PR. O aceite conjunto das interfaces ainda é necessário. O backend do aviso de saída está neste recorte dependente; os avisos ao aluno estão no #116. O rótulo visual “histórico de todas as turmas” no desempenho e a apresentação de `ALUNO_SAIU_TURMA` na futura tela do professor continuam com Lucas.

Não fechar a #55 inteira sem conferir o rótulo do desempenho. Depois de integrar, repetir as regressões e conferir FKs/limpeza somente dos IDs fictícios, sem excluir filas globais ou dados de demonstração. A contagem da #54 e seus rótulos de ativos/histórico continuam sendo uma entrega própria.
