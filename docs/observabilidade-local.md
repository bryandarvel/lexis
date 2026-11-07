# Observabilidade local e triagem — #108

Escopo aprovado por Bryan em03/11/2026: aproveitar os recursos existentes para as duas máquinas e a demonstração local. Nenhuma biblioteca de telemetria, conta externa, APM, tracing distribuído, dashboard hospedado ou monitor automático foi instalado nesta etapa. Sentry/outro provedor será discutido no plano de deploy, com privacidade e custos aprovados antes de habilitar.

## O que está disponível

| Recurso | Evidência no código e limite |
|---|---|
| Logs de requisição | request-observability.js gera UUID próprio e X-Request-Id; registra método, status e duração ao finalizar. Em NODE_ENV=test, o registro normal de conclusão é desativado. Não contém caminho/URL ou corpo, portanto não permite separar rotas automaticamente nem medir experiência do navegador. |
| Erros correlacionados | error-handler.js usa requestId e código controlado; erros inesperados não devolvem sua mensagem bruta. operational-log.js admite apenas metadados de lista positiva; não serializa exceção/request/headers/usuário. |
| Banco | prisma.js emite database_error/database_warning sem mensagem ou parâmetros brutos. GET /health confirma somente processo HTTP e uma consulta SELECT1 ao banco; não verifica serviços externos, e-mail ou sucesso da IA. |
| E-mail | npm run email:status consulta contagens agregadas de notificações/recuperação em banco local permitido. Não envia e-mail, reserva fila ou lista destinatários/textos. email:process é outra operação, não uma verificação passiva. |
| Gemini | Diagnóstico ampliado e espera segura foram integrados na dev pelo [PR #101](https://github.com/bryandarvel/lexis/pull/101), merge044e710. Incluem status externo, espera e transporte de lista positiva, sem corpo externo/projeto/chave. Conferir o hash da máquina: cópias anteriores ao merge ainda não possuem esses campos. |

Esses logs são locais/console. Não foi configurada centralização, retenção persistente, agregação entre máquinas, alerta de plantão, medição de percentis ou garantia de captura quando o processo encerra abruptamente.

## Antes da demonstração, em cada máquina

1. Confirmar a branch/commit integrado com git status, sem descartar trabalho. Instalar backend e frontend em suas pastas com npm ci e configurar somente o .env pessoal ignorado. Não executar npm ci na raiz sem pacote.
2. Conferir Docker Compose na pasta backend e o MySQL saudável. Não usar reset, apagar volumes nem repetir seed em banco já utilizado como forma de diagnóstico.
3. Com a API iniciada e a porta local correta, consultar no PowerShell:

```powershell
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3000/health'
```

`status: ok`/`database: connected` permite avançar à conferência da sessão; não significa que Gemini/OCR/Resend estão disponíveis. Falha HTTP503 indica banco indisponível nesse health; conexão recusada pode ser API desligada/porta diferente. Conferir o terminal e a porta configurada sem expor .env.

4. Na pasta backend configurada, `npm.cmd run email:status` é somente consulta. Ele recusa produção, hosts remotos e bancos fora de lexis/lexis_test. Não acrescentar email:process ao roteiro sem autorização para envio.
5. Testar o fluxo com contas fictícias, conforme o roteiro de aceite. Não analisar textos reais nem enviar e-mails apenas para provar que o painel está saudável.

## Durante uma falha

Registrar somente horário/fuso, branch/commit, ação genérica, status HTTP, código seguro e X-Request-Id da resposta. Esse ID pode ser visto em Rede/Network; não copiar Authorization, cookies, corpo, endereço completo com token ou arquivo HAR. Capturas de texto de redação também podem expor dados pessoais.

Procurar o mesmo UUID no terminal do backend. Uma rejeição controlada4xx pode ser entrada inválida, sessão/papel ou conflito de estado; não é automaticamente indisponibilidade. Para erro inesperado500, preservar o trabalho, registrar metadados e reproduzir com fixture antes de corrigir. Não publicar stacktrace bruto em Issue nem desativar autenticação/validação para continuar.

Na dev que contém o #101:

- `GEMINI_*LIMIT*`/cota: respeitar a espera mínima, conferir a configuração/cota no painel do provedor sem mostrar chave. O prazo não garante liberação; não repetir em várias abas ou trocar de chave do mesmo projeto para tentar renovar cota.
- `GEMINI_COOLDOWN`/`GEMINI_REQUEST_IN_PROGRESS`: proteção deste processo recusou nova chamada. Não reiniciar a API para contorná-la.
- Timeout/conexão/indisponibilidade: conferir metadados seguros; não inferir o HTTP externo apenas do status502 local. Uma nova solicitação é manual e não deve criar chamadas duplicadas.
- Falha de análise não apaga conclusão anterior; distinguir a data do resultado mostrado da última tentativa. Conferir também se comentário/nota humanos foram preservados.

O nome/quantidade de códigos disponíveis depende da branch integrada. Diagnóstico não altera configurações, cobrança, modelos, dados ou fila automaticamente.

## Quando interromper e como retomar

Interromper a demonstração da ação afetada se health falhar, houver erro inesperado repetido, exposição de dado privado, violação de papel ou risco de perda de texto. Não tentar compensar com publicação automática, múltiplos cliques ou desativação de proteções. Conferir se houve persistência antes de reenviar uma ação irreversível.

Após uma correção: repetir o caso fictício e sua regressão, o pacote afetado e, quando o contrato cruzar front/back, ambos. Depois de integrar vários PRs, repetir instalação, migrations em destino confirmado, testes e aceite do conjunto: checks verdes isolados não validam toda a pilha. E2E/CI ampliado continua na #66 e depende das telas integradas do Lucas.

Não há alerta automático nesta etapa. Operação pública exige plano próprio de HTTPS/banco/backups, domínio/remetente, retenção e acesso a logs, redação de dados sensíveis, custos e eventual provedor de telemetria. Destino futuro escolhido: Vercel+Railway; nenhum recurso foi provisionado por este guia.
