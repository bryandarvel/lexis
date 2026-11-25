# Reabertura de turma — backend da #65

Decisão de produto aprovada em 03/11/2026. A interface é responsabilidade do Lucas; este contrato não indica que ela já foi implementada.

`POST /api/turmas/:turmaId/reabrir`, autenticado como PROFESSOR responsável, sem corpo.

- 200: `{ data: { turma } }`, no mesmo formato de `GET /api/turmas/:turmaId`, com `ativa: true` e `arquivadaEm: null`.
- 401: autenticação ausente/inválida; 403: papel não permitido; 422: UUID inválido.
- 404 `CLASS_NOT_FOUND`: inexistente ou pertencente a outro professor, sem diferenciar esses casos.
- 409 `CLASS_ALREADY_ACTIVE`: já ativa, inclusive se outra aba acabou de reabri-la. Reconsultar o estado; não repetir automaticamente.

O código de acesso atual é preservado. Nenhuma matrícula encerrada é restaurada: o aluno precisa entrar novamente pelo código, criando uma nova matrícula histórica. A reabertura não altera propostas, redações ou feedbacks. Propostas arquivadas continuam arquivadas; as ativas voltam a ser acessíveis após nova matrícula ativa. Os prazos não são alterados.

A atualização usa uma condição atômica de propriedade e estado. Duas reaberturas simultâneas resultam em um sucesso e um conflito, não duas transições. Não há migration ou chamada a provedor externo.

Para o cliente: a ação fica disponível em turma arquivada, pede confirmação explicando que alunos não são rematriculados automaticamente e atualiza os dados retornados. A confirmação antiga que diz “não é possível reabrir” precisará ser revista quando a interface integrar este endpoint.
