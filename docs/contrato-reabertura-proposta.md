# Reabertura de proposta — backend da #69

Decisão aprovada em 03/11/2026: manter o prazo original, inclusive vencido. A interface será integrada pelo Lucas; este documento não afirma que ela já existe.

`POST /api/temas/:temaId/reabrir`, sem corpo, autenticado como PROFESSOR responsável.

- 200: `{ data: { tema } }`, no formato de `GET /api/temas/:temaId`, com `ativo: true` e `arquivadoEm: null`.
- 401: autenticação ausente/inválida; 403: papel não permitido; 422: UUID inválido.
- 404 `ESSAY_TOPIC_NOT_FOUND`: proposta inexistente ou pertencente a outro professor, sem revelar a diferença.
- 409 `CLASS_ARCHIVED`: reabrir a turma antes da proposta.
- 409 `ESSAY_TOPIC_ALREADY_ACTIVE`: proposta já ativa, inclusive em outra aba. Reconsultar; não repetir automaticamente.

Reabrir não edita enunciado, descrição, instruções, prazo, critérios nem o bloqueio estabelecido no primeiro envio. Não apaga redações ou feedbacks e não permite reenviar uma redação já enviada. Proposta vencida reaparece para alunos com matrícula ativa; novas entregas continuam marcadas como atrasadas em relação ao prazo original, pela regra existente.

A verificação da turma ativa ocorre sob bloqueio na transação, antes da transição condicional da proposta. Não há migration, nova dependência nem chamada a provedor externo.

Para a interface: ação em proposta arquivada, explicando que o prazo é preservado e pode estar vencido. Exigir reabertura da turma quando necessário; atualizar a confirmação antiga de irreversibilidade ao integrar o endpoint. As telas do Lucas não são alteradas por esta entrega de backend.
