# Proposta de deploy — Vercel + Railway

**Proposta técnica aprovada por Bryan em 04/11/2026, sem provisionamento agora.** A aprovação cobre frontend Vercel, API Express + MySQL Railway, subdomínios HTTPS do mesmo domínio, backup diário e antes de migrations, e-mail desligado até autorização específica. Bryan mantém demonstração local agora e deploy depois de terminar o projeto. Domínio concreto, orçamento, retenção e recursos ainda precisam de aprovação separada. Nenhuma conta, domínio, DNS, recurso, credencial, migration remota, worker, envio ou cobrança é autorizado por este documento. Promoção para `main` está fora da meta atual.

## Arquitetura proposta e limites atuais

Preservar React/Vite estático na Vercel, Express Node 24 e MySQL 8.4 na Railway. Não migrar para Next.js/PostgreSQL nem introduzir SDK, storage, APM ou fila externos só para publicar. API e banco devem ficar no mesmo ambiente/região compatível; somente a API e o frontend serão públicos. A Railway documenta [MySQL](https://docs.railway.com/databases/mysql) e [rede privada entre serviços](https://docs.railway.com/networking/private-networking). Isso não prova que nossa aplicação já se conecta corretamente em produção.

O código atual usa upload OCR em memória (`upload-ocr-image.js`), não arquivos persistidos da foto; banco armazena textos/versões. Não prometer histórico da imagem original nem contratar Blob/volume para a API sem um requisito novo. O volume persistente do MySQL precisa ser previsto e protegido; `output/` e `tmp/` não são repositórios de evidência durável da aplicação.

## Decisões necessárias antes de criar recursos

| Decisão do Bryan | Estado da proposta e detalhes ainda pendentes |
| --- | --- |
| Público/dados da primeira publicação | Homologação restrita, só fictícios, sem corpus real ou uso escolar até consentimento/protocolo e revisão apropriados. |
| Domínio e sessão | Estratégia de subdomínios HTTPS do mesmo domínio aprovada; por exemplo `app.example.com` e `api.example.com` (nomes fictícios, não existentes). Domínio concreto, propriedade e orçamento pendentes antes de registrar/configurar. |
| Ambiente/branch | Homologação separada da produção, release por hash revisado. Não vincular deploy automático a todos os pushes nem promover `main` nesta meta. Definir fluxo posterior expressamente. |
| Orçamento | Aprovar teto mensal, responsável, alertas e política de parada para Vercel, Railway/banco/volume/backups, domínio e provedores. Não presumir gratuidade, disponibilidade ou plano contratado. |
| Retenção e backup | Frequência diária e antes de migration aprovada. Definir retenção, RPO/RTO e responsável. Homologar restauração e exportação privada; não copiar banco real para teste local. |
| E-mail | Envio desativado até autorização específica, aprovado. Domínio/remetente próprios verificados e destinatários reais ainda precisam de autorização. Decidir frequência/limite e responsável pela fila. |

Aprovar o plano não equivale a autorizar compras, DNS ou envio de dados. Solicitar autorização dos recursos/destinos concretos quando chegar a essa fase.

## Frontend e HTTPS

Proposta de configuração futura: raiz `frontend/`, instalação `npm ci`, build `npm run build`, saída `dist`. A aplicação é SPA: validar acesso direto/reload de `/login`, rotas protegidas e `/redefinir-senha` com regra de fallback, preservando assets e eventual proxy. A documentação [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite) explica o fallback; não foi criado `vercel.json` neste recorte.

`VITE_API_URL` é configuração pública, substituída no build; **nenhuma chave Gemini/OCR/Resend/JWT ou URL de banco pode ter prefixo VITE_**. Alterar seu valor exige novo build, não apenas reiniciar a API. Conferir isso conforme a [documentação do Vite](https://vite.dev/guide/env-and-mode).

Ativar HTTPS válido nos destinos e testar o certificado/domínio antes de liberar usuários. A Railway oferece [domínios públicos e certificados](https://docs.railway.com/networking/public-networking); não há domínio do projeto configurado nesta entrega.

## Sessão: risco de publicar nos domínios padrão separados

`auth-cookie.js` usa refresh HttpOnly, `Secure` em produção, `SameSite=Lax`, path `/api/auth`, sem `Domain` compartilhado. O access token permanece em memória. `api.js` usa credenciais; o CORS permite exatamente `FRONTEND_URL`, não uma lista de previews.

Frontend `*.vercel.app` e API em domínio Railway são sites diferentes. O POST de refresh por fetch/XHR não satisfaz a exceção de navegação de `Lax`; logo, login visual isolado não comprova sessão funcional. As regras estão em [Set-Cookie, MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie). Não “corrigir” usando localStorage, CORS `*`, cookie sem HttpOnly ou troca automática para `SameSite=None`.

Recomendação: subdomínios do mesmo domínio registrável, ambos HTTPS. Eles continuam sendo origens distintas, portanto manter `withCredentials` e CORS exato; o cookie pode continuar restrito ao host da API. Alternativa de proxy de mesma origem exige análise e teste de roteamento/cookies/cabeçalhos antes de configurar. Se nenhuma alternativa for aprovada, a autenticação é impedimento para o deploy, não detalhe a ignorar. Previews externos não devem receber sessão/credenciais de produção.

## API, proxy e banco: trabalho posterior necessário

- `server.js` já lê `HOST`/`PORT`, mas o padrão é loopback. Configurar bind acessível ao ambiente (`0.0.0.0` ou endereço exigido pela topologia) e porta fornecida; usar `npm start`, não `--watch`. Validar `/health` pela rede externa e privada antes da liberação.
- `app.js` não define `trust proxy`. Os limitadores dependem de `req.ip`. Confirmar a cadeia real e configurar confiança restrita com testes de IP/spoofing; não adicionar `trust proxy=true` ou um número de saltos por suposição.
- `prisma.js` monta configuração do adapter a partir de host/porta/usuário/senha/nome e não encaminha automaticamente parâmetros de query da URL para TLS. Em produção, `allowPublicKeyRetrieval=false`. Validar DNS privado/IPv4-IPv6, autenticação e criptografia compatíveis com o serviço escolhido; não liberar public-key retrieval, desativar validação TLS nem expor banco para contornar conexão.
- Fixar/verificar MySQL 8.4 e charset/collation compatíveis com migrations; não presumir a versão do template Railway. Validar conta de menor privilégio, limites de conexão/pool (hoje cinco por processo) e credencial separada para migrations quando possível. Não usar senha do Compose local na nuvem.
- Uma única instância inicialmente é proposta, **não configuração já feita**. Rate limiting e controle Gemini #101 são em memória/processo; réplicas/restarts não compartilham cota. Escala maior exige projeto de controle compartilhado antes, não afirmar limite global garantido.
- Revisar alcance do cadastro público por papel e da documentação API, retenção dos logs e privacidade antes do uso público. Não remover autorização ou validação para facilitar a demonstração.

## Variáveis, release e migrations

Separar segredos por ambiente, com acesso mínimo. Backend: `NODE_ENV`, `HOST`, `PORT`, `FRONTEND_URL`, `DATABASE_URL`, segredos/prazos JWT, `BCRYPT_ROUNDS` e integrações validadas em `env.js`. Não copiar o `.env` local inteiro. A configuração Prisma também exige `SHADOW_DATABASE_URL`; `migrate deploy` não usa shadow, mas a variável deve satisfazer o config sem apontar para dados de outra aplicação. `TEST_DATABASE_URL` nunca deve apontar para produção; testes ficam no CI/local.

Build proposto da API: `npm ci` com dependências necessárias ao Prisma CLI e `prisma generate`; release controlado executa `prisma migrate deploy` **uma vez**, após backup testado e autorização para aquele banco. API inicia só quando schema e Client forem compatíveis. Não usar `migrate dev`, `db push`, reset ou seed contra produção. Adicionar comandos/configuração concreta em PR posterior, depois das aprovações e teste em homologação.

No rollback, voltar binário/frontend não desfaz schema nem migrações de dados. Definir compatibilidade retroativa, manutenção/rollback de código ou restauração autorizada conforme o incidente; não executar SQL inverso ou restaurar por conta própria. Registrar hash, versão do schema, backup e responsável sem credenciais.

## Backup e restauração

A Railway documenta [backups de volumes](https://docs.railway.com/volumes/backups), com agendas e restrições de restauração. Não há agenda ativada ou recuperação comprovada para LÉXIS. O plano deve registrar retenção/custo escolhidos, acesso às cópias e ensaio de restauração autorizado; um volume persistente sozinho não é backup. Definir também exportação lógica privada e como recuperar credenciais/versão compatível sem sobrescrever o ambiente errado.

## Resend e operação

Antes de envio normal, verificar domínio próprio e remetente conforme [Verified Domains, Resend](https://resend.com/docs/dashboard/domains/introduction); preferir subdomínio transacional se aprovado. Revisar SPF/DKIM e política DMARC com quem administra DNS. Não usar `onboarding@resend.dev` como configuração final nem ativar rastreamento de links de recuperação sem análise.

**Risco atual importante:** `NODE_ENV=production` envia ao `emailDestino` real, não ao `EMAIL_DEMO_RECIPIENT`. Manter `EMAIL_ENABLED=false` e nenhum worker enquanto não houver aprovação específica. O script `email:process` processa feedback e recuperação; o cron/worker, frequência, limite, idempotência, falhas e itens ENVIANDO interrompidos precisam de operação definida. Eventos novos #72/#64/#55 continuam só no sistema. Não ampliar os tipos enviados por e-mail.

`email:status` atual recusa produção/remoto: o guia local não pode ser tratado como monitoramento pronto da nuvem. Preparar consulta operacional autorizada/sanitizada em outro recorte se necessária. `/health` comprova API/banco, não Gemini/OCR/Resend; disponibilidade/cota externas não são garantidas. APM externo segue adiado, conforme decisão do item 14.

## Gate de publicação

1. PRs integrados e revisão/CI, instalação/auditoria conjunta, aceite nas duas máquinas e E2E #66 aprovados; sem bloqueios de isolamento/sessão.
2. Plano concreto, domínio, região, versões, orçamento, retenção/backups e remetente aprovados pelo Bryan; autorizações separadas para recursos, migrations remotas e chamadas reais.
3. Homologação fictícia: health/reload de rotas, cookie/refresh/logout e troca de senha, papéis/posse, upload/limites, fila desligada por padrão, backup/restauração e rollback conferidos. Nenhuma promessa de cota/qualidade da IA por teste simulado.
4. Somente então pedir autorização para publicação do release escolhido. A aprovação desta proposta não promove `main` nem autoriza dados reais ou avaliação acadêmica.
