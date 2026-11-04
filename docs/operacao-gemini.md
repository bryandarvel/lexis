# Operação da análise por Gemini — Issue #36

## O que o controle local faz

O cliente usa o SDK Google já instalado (`@google/genai` 2.16.0) e `models.generateContent`, com `httpOptions.retryOptions.attempts: 1` e timeout existente. Cada solicitação admitida faz no máximo uma tentativa HTTP; falhas não disparam novas análises automaticamente e não existe fallback para Interactions. Não é criada uma interação persistente nem enviado `store`, que é um parâmetro exclusivo de Interactions; isso não equivale a uma garantia de retenção zero pelo provedor.

O modelo e a chave são definidos por `GEMINI_MODEL` e `GEMINI_API_KEY`. Esta consolidação não altera o `.env` pessoal, o modelo padrão versionado ou o exemplo. As versões de modelo citadas nos registros históricos não são uma recomendação atual. Disponibilidade e cota dependem do projeto Google; trocar a chave do mesmo projeto não renova limites.

O prompt versionado, critérios e JSON Schema seguem como `contents`, `systemInstruction`, `responseMimeType` e `responseJsonSchema`. A validação estrita do resultado e das evidências permanece no servidor. Respostas sem texto ou interrompidas por limite de saída/bloqueio são recusadas. Para Gemini 3.6+ e 3.5 Flash-Lite, os controles descontinuados `temperature`, `topP` e `topK` são omitidos; essa omissão não altera o texto do prompt nem a versão do modelo. O caso 3.5 Flash-Lite tem regressão própria, reproduzida antes da correção, de acordo com o [checklist oficial de migração do Google](https://github.com/google-gemini/gemini-skills/blob/main/skills/gemini-api-dev/references/migration.md#migrate-to-gemini-38-flash-or-gemini-35-flash-lite).

Todos os professores atendidos pelo mesmo processo Node compartilham uma única proteção em memória:

- apenas uma chamada em andamento, mesmo para redações diferentes;
- intervalo mínimo de 20 segundos entre inícios de chamadas;
- após HTTP 429, espera mínima de 60 segundos, ou prazo estruturado do Google quando ele pedir mais;
- falhas de rede, timeout e HTTP 408/5xx impõem pausas progressivas de 30, 60, 120, 240 e no máximo 480 segundos; um sucesso reinicia essa progressão. Um prazo maior informado pelo provedor é respeitado. A pausa apenas permite uma nova tentativa manual;
- `Retry-After` aceita segundos inteiros não negativos ou uma data HTTP futura; valores inválidos não reduzem a espera de segurança;
- o SDK de `generateContent` não preserva cabeçalhos em `ApiError`; nesse caminho o prazo é lido de `google.rpc.RetryInfo.retryDelay`, quando disponível, com arredondamento para cima e validação numérica;
- pedidos recusados localmente não chegam ao Gemini e não renovam o prazo por si só;
- consultas GET do histórico continuam disponíveis, sem geração nem consumo de cota de inferência.

O limitador existente de cinco solicitações por professor a cada quinze minutos continua ativo. Ele é uma proteção adicional, não uma representação da cota do Google. Uma tentativa pode ser registrada como erro no histórico mesmo quando a proteção local impede a chamada externa; quantidade de registros não equivale a quantidade de chamadas ao provedor.

O HTTP 429 local (`AI_ANALYSIS_RATE_LIMIT_EXCEEDED`) inclui `Retry-After` e `error.details.retryAfterSeconds`, correspondentes à janela do professor. A tela aplica esse prazo como faz com os erros Gemini; ele não representa uma cota externa nem modifica a proteção de cinco solicitações.

## Mensagens e contrato HTTP

Os erros abaixo usam HTTP 503. Quando há espera mínima, a resposta inclui `Retry-After` e `error.details.retryAfterSeconds` (inteiro positivo). A interface usa o corpo da resposta para o prazo, sem depender da exposição de cabeçalhos no CORS.

| Código LÉXIS | Significado |
| --- | --- |
| `GEMINI_RATE_LIMITED` | O Google retornou `rate_limit_exceeded` ou `too_many_requests`. |
| `GEMINI_DAILY_QUOTA_EXCEEDED` | O Google identificou explicitamente `quota_exceeded`. |
| `GEMINI_SERVICE_LIMIT_REACHED` | HTTP 429 sem código conhecido: a cota exata não é inferida da mensagem. |
| `GEMINI_COOLDOWN` | O processo local ainda está no intervalo de espera; nenhuma chamada externa foi feita. |
| `GEMINI_REQUEST_IN_PROGRESS` | Outra chamada está em andamento neste processo; nenhuma chamada externa foi feita. |

Erros externos de limite incluem somente `statusExterno: 429`, `codigoProvedor` de lista positiva (ou `unknown`) e `retryAfterSeconds`. Mensagem, corpo e cabeçalhos brutos do Google não são enviados ao navegador nem registrados. O histórico persiste o código LÉXIS e a mensagem fixa segura. Logs operacionais correlacionados por `requestId` passam a incluir o HTTP externo (400–599), espera mínima e código de transporte de lista positiva quando disponíveis, sem conteúdo da redação ou identificação do projeto. Esses metadados não são retroativos e não são gravados em novas colunas no banco.

HTTP 502 com `GEMINI_SERVICE_UNAVAILABLE` identifica indisponibilidade externa; `details.statusExterno` permite distinguir, por exemplo, HTTP 503 do Google. `GEMINI_CONNECTION_FAILED` identifica falha de transporte conhecida (ou `fetch failed`) e `GEMINI_REQUEST_REJECTED` sinaliza rejeição HTTP 4xx que exige conferir a integração. HTTP 401/403 externo mantém `GEMINI_AUTHENTICATION_FAILED`; timeout mantém HTTP 504 / `GEMINI_TIMEOUT`. Erros temporários incluem a espera mínima também no contrato HTTP.

`RESOURCE_EXHAUSTED` com código numérico 429, usado por `generateContent`, é tratado como limite de uso não identificado: não comprova cota diária nem é classificado por palavras da mensagem externa. Os códigos textuais explícitos da tabela continuam reconhecidos quando presentes.

**O fim da contagem regressiva não significa que a cota foi liberada.** Ele apenas permite uma nova solicitação manual. Uma cota diária não é restabelecida pela espera local de 60 segundos; confira o painel e a renovação informada pelo Google. Não há nova tentativa automática ao terminar a contagem.

## Análise anterior e trabalho humano

A interface separa a última tentativa da última análise concluída. Progresso e erro dizem respeito à tentativa mais recente; sugestões e destaques podem continuar vindo da conclusão anterior, com aviso e data explícitos. Uma nova conclusão passa a ser a exibida.

Somente uma resposta concluída do POST anuncia “Nova análise concluída e salva”. O GET anuncia “Resultado salvo consultado”, e um sucesso antigo não pode permanecer associado a uma tentativa posterior com erro. Os detalhes identificam a data do resultado. Trechos comuns a vários critérios exibem sublinhados com todas as cores relacionadas, preservando os vínculos e a validação literal.

A contagem vigente usa os metadados da resposta HTTP. Números relativos presentes em mensagens históricas antigas não são reapresentados como se começassem de novo; a tela mantém a data e o motivo da falha. Essa adaptação é de apresentação: não apaga nem reescreve os registros existentes.

O histórico não é apagado. Os destaques continuam exigindo posições válidas e correspondência literal com o texto atual; trechos divergentes não são sublinhados. Comentários, rascunhos e notas humanos não são sobrescritos pela troca de análise. A IA permanece consultiva e não publica correção.

## Duas máquinas e limites externos

A proteção é **por processo**, não distribuída, e reiniciar o servidor apaga sua memória de espera. Ela não altera nem reinicia a cota do Google. Duas máquinas, dois processos ou ferramentas de avaliação podem consumir o mesmo projeto simultaneamente. Chaves diferentes do mesmo projeto também compartilham a cota externa.

Para os testes de Bryan e Lucas, coordenem as análises reais, preferencialmente usando apenas um backend para a demonstração e uma solicitação por vez. Para operação com múltiplas instâncias, será necessário um controle compartilhado de consumo, a ser tratado separadamente. Não foi introduzido Redis, fila distribuída, ajuste de cobrança, troca de chave/modelo ou cálculo local de cota diária.

## Verificação sem cota

As regressões do cliente executam inclusive o SDK real com `fetch` substituído por respostas fictícias, garantindo que um 429 não cause cinco tentativas. Testes de relógio simulado cobrem concorrência, intervalos, `Retry-After` e expiração. Testes de contrato cobrem resposta HTTP e testes do frontend cobrem seleção do histórico e correspondência dos destaques.

Os testes automatizados não chamam Gemini, OCR.space ou Resend. Sua aprovação não comprova disponibilidade atual ou qualidade pedagógica da IA. Uma nova análise real com texto fictício, persistência e conferência na tela deve ser autorizada e executada separadamente, após conferir a cota.

Referências oficiais: [limites por projeto](https://ai.google.dev/gemini-api/docs/rate-limits), [códigos de erro](https://ai.google.dev/gemini-api/docs/api-errors) e [parâmetros descontinuados](https://ai.google.dev/gemini-api/docs/troubleshooting). O contrato de `generateContent` também foi conferido nos tipos e no código do SDK instalado.

## Comparação com o PR #70

O #70 protege `interactions.create` com `retries: { strategy: 'none' }`. O trabalho local já utiliza `models.generateContent`; nele a opção correspondente é `httpOptions.retryOptions.attempts: 1`, conferida nos tipos e no código do SDK 2.16.0 instalado. Não combinar os dois endpoints nem adicionar fallback ou variável de repetições.

A abordagem de teste do Lucas foi adaptada para um servidor HTTP em 127.0.0.1. O cliente de teste é configurado deliberadamente para cinco tentativas: com o guard por chamada, HTTP 429 e 503 fazem uma requisição; removendo somente esse guard, ambos fazem cinco e os testes falham. Sucesso e conexão recusada continuam com uma tentativa mesmo sem o guard neste caminho do SDK; são controles, não provas da correção. A regra de não repetir também é explícita no construtor utilizado pela aplicação.

Testes do frontend incluem renderização SSR dos componentes com cache Vite temporário isolado. Nenhuma biblioteca foi adicionada, nenhuma spec Playwright foi criada e nenhuma chamada real ao Google foi feita nesta consolidação. Os resultados completos de lint/testes/build e as limitações de integração são registrados no PR associado à Issue #36.

## Registros anteriores

As notas locais anteriores foram preservadas em [histórico de ensaios](historico-gemini-local.md), identificadas como registros históricos não reexecutados nesta consolidação. Não confundir chamadas técnicas fictícias com avaliação acadêmica, nem tomar esses números de testes como os da branch atual. O prompt v4 descrito nessas notas é uma alteração separada; esta etapa conserva o prompt versionado da base até seu PR próprio.
