# Notificações do professor — contrato da #72

Entrega de backend. A tela e o sino são do Lucas e não são considerados implementados por este contrato.

## Consultar

`GET /api/professor/notificacoes`, autenticado como PROFESSOR, sem corpo.

Resposta 200:

```json
{
  "data": {
    "notificacoes": [
      {
        "id": "UUID do aviso",
        "usuarioId": "UUID do professor",
        "tipo": "REDACAO_ENVIADA",
        "titulo": "Nova redação recebida",
        "mensagem": "Uma redação foi enviada para a proposta e turma identificadas.",
        "lidaEm": null,
        "statusEmail": null,
        "feedbackVersaoId": null,
        "feedbackVersao": null,
        "redacaoId": "UUID da redação",
        "redacao": {
          "id": "UUID da redação",
          "tema": {
            "id": "UUID da proposta",
            "enunciado": "Desafios da educação midiática no Brasil",
            "turma": { "id": "UUID da turma", "nome": "Turma fictícia" }
          }
        },
        "criadaEm": "2026-11-03T22:00:00.000Z"
      }
    ],
    "totalNaoLidas": 1
  }
}
```

Os IDs ilustrativos acima devem ser substituídos por UUIDs recebidos da API. A lista segue da mais recente para a mais antiga. Só contém registros cujo `usuarioId` é o do professor autenticado; não aceita um ID de usuário do cliente. O payload não inclui texto da redação, notas ou análises privadas. Lista vazia: `notificacoes: []`, `totalNaoLidas: 0`.

Para `REDACAO_ENVIADA`, a interface pode usar `redacaoId` para abrir a correção na rota existente do professor. Não usar `feedbackVersao` nesse evento: ele é nulo.

## Marcar como lida

`PATCH /api/professor/notificacoes/:notificacaoId/lida`, sem corpo. Resposta 200: `{ data: { notificacao } }`, com o mesmo formato acima e `lidaEm` preenchido. Repetições e chamadas concorrentes conservam a primeira data de leitura.

Erros nos endpoints:

- 401: autenticação ausente/inválida;
- 403: papel diferente de PROFESSOR;
- 404 `NOTIFICATION_NOT_FOUND` no PATCH: aviso inexistente ou pertencente a outra conta, sem diferenciar esses casos;
- 422 no PATCH: UUID inválido.

## Gatilho e consistência

O envio definitivo cria o aviso dentro da mesma transação da redação e do congelamento da proposta. Falha na persistência do aviso reverte o envio; duas tentativas concorrentes não geram dois avisos. Não há um endpoint separado para criar avisos pelo frontend, nem repetição automática do envio por esse recurso.

Decisão do Bryan: os novos eventos ficam apenas dentro do sistema. O aviso é criado com `emailDestino: null` e `statusEmail: null` — nulo significa que não há envio de e-mail previsto, não uma pendência. A fila usa lista positiva dos dois tipos de feedback e exige destinatário e versão de feedback; novos tipos não são reservados mesmo com um status pendente incorreto.

Os endpoints `/api/aluno/notificacoes` e `/api/aluno/notificacoes/:id/lida` continuam existindo, preservando `feedbackVersao.numero` e `feedbackVersao.feedback.redacaoId` para avisos de feedback. Não migrar o cliente para `/api/notificacoes`.

## Migration e integração futura

Migration `20261103220000_notificacoes_multiplos_eventos`: torna a versão do feedback, o destinatário e o status de e-mail opcionais, acrescenta vínculo opcional com redação e a unicidade por usuário/redação/tipo. Dados de feedback existentes são preservados. O schema prepara também os tipos `MATRICULA_ENCERRADA`, `TURMA_ARQUIVADA` (#64) e `ALUNO_SAIU_TURMA` (#55), mas seus gatilhos serão entregues separadamente; não os anunciar como implementados.

Após revisão/CI e merge na dev, cada máquina deverá gerar o Prisma Client e aplicar migrations no seu próprio banco local, conforme README. Esta entrega aplicou a migration apenas no banco local de testes, não no banco de demonstração, remoto ou produção.
