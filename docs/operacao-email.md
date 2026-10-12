# E-mail e recuperação de senha na demonstração

## Configuração local

No `backend/.env`, configure `RESEND_API_KEY`, `RESEND_FROM` e `EMAIL_DEMO_RECIPIENT` localmente; nunca cole esses valores em conversas ou os versione. Ative `EMAIL_ENABLED=true` apenas quando quiser operar os fluxos de e-mail. Reinicie a API após alterar o ambiente. Confira que `FRONTEND_URL` aponta para o endereço usado no navegador: o link de recuperação utiliza esse endereço.

Na configuração sandbox atualmente utilizada, o teste autorizado foi aceito pelo Resend sem domínio próprio. Essa evidência vale apenas para o remetente/destinatário configurados; não comprova permissão para enviar a outros endereços. Domínio próprio e produção não foram configurados.

## Processamento

A API enfileira as solicitações; não existe serviço de agendamento instalado. Em outro PowerShell, dentro de `backend/`, execute um lote:

```powershell
npm.cmd run email:process
```

O comando processa primeiro a recuperação de senha e depois notificações de feedback. `EMAIL_BATCH_SIZE` limita **cada fila**, não a soma das duas. Antes de executar, confira que o ambiente contém apenas dados fictícios de demonstração e que o destinatário concorda com os envios pendentes. Não use esse comando para testar uma única mensagem quando houver outros itens na fila.

Para a apresentação, um integrante pode manter o seguinte loop em um terminal dedicado, depois de habilitar e revisar a configuração:

```powershell
while ($true) {
    npm.cmd run email:process
    Start-Sleep -Seconds 30
}
```

Encerre com `Ctrl+C`. O próximo ciclo só começa após o término do anterior. Não manter múltiplos loops. Nenhum loop, serviço externo ou agendamento de produção foi ativado por esta entrega. Uma implantação pública precisa de operação supervisionada, monitoramento e política de retenção própria.

## Destinatários e conteúdo

- Fora de produção, notificações são direcionadas somente a `EMAIL_DEMO_RECIPIENT`.
- Recuperação de senha só permite redirecionamento da própria conta desse destinatário ou de contas fictícias `@lexis.example.com`. Não encaminha o reset de outra conta real para o operador da demonstração.
- Notificações não incluem redação, nota ou feedback no corpo.
- O token de recuperação vai no fragmento do link e é removido da barra pelo frontend. Não registre, compartilhe nem capture esse link em screenshots. O banco guarda somente o hash.
- Quando o envio está desabilitado, a recuperação responde indisponibilidade sem consultar a existência da conta. Quando habilitado, contas inexistentes/inativas recebem a mesma resposta genérica das demais.

## Falhas e prevenção de duplicação

Notificações usam reserva condicional no banco, uma chave de idempotência por notificação, `EMAIL_MAX_ATTEMPTS` (padrão 3) e `EMAIL_RETRY_DELAY_MS` (padrão 60 segundos). Falhas controladas ficam disponíveis para uma nova tentativa; mensagens registradas como enviadas não são selecionadas novamente. A idempotência do provedor não deve ser interpretada como garantia ilimitada de entrega exatamente uma vez.

Recuperação usa uma tentativa por solicitação. O token em texto puro só existe durante o envio; uma falha invalida essa solicitação. O usuário pode solicitar outro link, respeitando o cooldown de 60 segundos e os limites da API. O sucesso de uma redefinição invalida todos os outros links e sessões daquela conta. Não reutilize uma solicitação de recuperação para gerar outro token com a mesma chave de idempotência.

Limitação operacional: se o processo for encerrado abruptamente depois da reserva, itens podem permanecer em `ENVIANDO`. Eles não são retomados automaticamente, pois o resultado do envio pode ser incerto. Para recuperação, solicite um novo link; o anterior expira. Para notificação, o operador deve conferir o resultado no provedor antes de decidir por uma recuperação manual. Nunca redefina todos os itens para `PENDENTE` indiscriminadamente. A retomada automática com lease e conciliação é uma melhoria operacional futura, não uma garantia atual.

## Evidência do teste real

Em 11/10/2026, uma mensagem neutra autorizada foi aceita pelo Resend e o destinatário confirmou o recebimento na caixa de entrada. Não foi uma redefinição de senha nem uma execução da fila inteira. Os cenários de fila e recuperação da suíte automatizada usam respostas simuladas, sem chamadas externas.

Em 12/10/2026, após nova autorização, uma única recuperação da conta fictícia `aluno1.demo@lexis.example.com` foi enfileirada e processada isoladamente: uma enviada, zero erros. O usuário abriu o link e confirmou redefinição. A verificação do banco confirmou solicitação consumida e invalidação de sessões. A configuração geral de envio permaneceu desativada; para usar o botão de recuperação durante a apresentação, habilite/reinicie a API e mantenha o processamento supervisionado conforme acima.
