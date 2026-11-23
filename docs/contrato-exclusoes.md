# Exclusões no backend

| Operação | Entrada | Sucesso | Bloqueio de domínio |
| --- | --- | --- | --- |
| `DELETE /api/auth/me` | Sessão e corpo JSON `{ "senhaAtual": "..." }` | `204` e limpeza do cookie de renovação | `409 ACCOUNT_HAS_ACTIVE_CLASSES` ou `422 CURRENT_PASSWORD_INVALID` |
| `DELETE /api/turmas/:turmaId` | Sessão de professor e UUID | `204` sem corpo | `409 CLASS_NOT_ARCHIVED` ou `CLASS_HAS_HISTORY` |
| `DELETE /api/temas/:temaId` | Sessão de professor e UUID | `204` sem corpo | `409 ESSAY_TOPIC_NOT_ARCHIVED` ou `ESSAY_TOPIC_HAS_HISTORY` |

As três rotas exigem autenticação (`401`). Nas rotas de turma e proposta, aluno recebe `403`, UUID inválido recebe `422` e item inexistente ou de outro professor recebe `404`. A exclusão da conta tem limitação de tentativas (`429`).

## Conta

A API não aceita ID no corpo: a conta vem exclusivamente da sessão. A transação confere novamente atividade, versão da sessão e credencial após adquirir a trava do usuário. Criação e reabertura de turmas compartilham essa trava, de modo que a conta não pode ser excluída ao mesmo tempo em que ganha uma turma ativa.

O registro permanece como **Conta excluída**, com endereço aleatório não entregável sob `.invalid`, senha substituída, conta inativa e versão de sessão incrementada. Tokens de renovação e recuperação são removidos, assim como cópias do endereço nos destinos de notificação. Matrículas ativas são encerradas sem remover o vínculo histórico. Redações, correções e suas referências de autoria permanecem. Não é necessário atualizar o schema nem criar migration para este recorte.

Essas regras não fazem expurgo de texto livre, avisos históricos sem vínculo ao autor, backups, logs externos ou e-mails já entregues ou em trânsito. Uma nova publicação para uma conta excluída não cria destino de e-mail. O recurso não é uma afirmação de anonimização completa do conteúdo histórico.

## Turma e proposta

Só é possível excluir um registro próprio **arquivado e sem histórico**. Qualquer matrícula ou proposta bloqueia a exclusão da turma, inclusive se encerrada ou arquivada. Qualquer redação, inclusive um rascunho, bloqueia a exclusão da proposta. Somente os critérios de configuração da proposta elegível são removidos junto com ela, explicitamente e na mesma transação.

O detalhe da turma retorna `podeExcluirDefinitivamente`, sem devolver dados das matrículas encerradas nem das propostas arquivadas. Para a proposta, o detalhe já informa a situação do arquivamento e `quantidadeRedacoes`, que inclui rascunhos. Esses dados orientam o botão; a transação sempre revalida o estado antes de excluir.

As transações trancam a linha-pai antes de verificar vínculos. As chaves estrangeiras impedem que uma nova matrícula, proposta ou redação seja inserida depois da remoção do respectivo pai. Um conflito de integridade desfaz a operação inteira.

## Alterações na própria conta

| Operação | Entrada | Sucesso |
| --- | --- | --- |
| `PATCH /api/auth/me` | Sessão e `{ nome, senhaAtual }` | `200` com usuário público atualizado. A sessão continua válida. |
| `POST /api/auth/alterar-email` | Sessão e `{ novoEmail, senhaAtual }` | `202` após o provedor aceitar o envio do link para o novo endereço. Não muda o login. |
| `POST /api/auth/confirmar-email` | `{ token }` do link recebido, sem exigir sessão ou acesso à caixa antiga | `200` com `data.avisoEmailAnteriorEnviado`. A troca invalida todas as sessões e os links anteriores de recuperação. O login passa a usar o novo endereço. |
| `POST /api/auth/alterar-senha` | Sessão e `{ senhaAtual }` | `202`: solicita um link de redefinição ao endereço atual usando a fila de recuperação. Não altera a senha nem a sessão. |
| `POST /api/auth/redefinir-senha` | `{ token, senha }` | `204` e revogação de todas as sessões. Também invalida eventual troca de e-mail pendente. |

O corpo antigo de atualização de nome sem senha e o corpo antigo com `novaSenha` em `/alterar-senha` deixam de ser aceitos. O perfil pede a senha atual para cada alteração. A nova senha só é digitada na tela aberta pelo link de redefinição.

Edição de nome, solicitação de e-mail e solicitação de senha exigem a senha atual e são limitadas por usuário. A API recusa senha incorreta com `422 CURRENT_PASSWORD_INVALID`. Apenas o link de redefinição permite gravar a nova senha. A recuperação pública de senha esquecida permanece disponível, com resposta genérica por endereço.

A migration `20261123000100_alteracao_email_verificada` guarda uma solicitação por conta, apenas com o hash do token, o novo endereço, a expiração e a versão da sessão. O link vale 30 minutos. Novos pedidos substituem os anteriores. A confirmação usa o índice único de e-mail do usuário, inclusive se outra conta confirmar ou cadastrar o mesmo endereço durante a espera: o perdedor recebe `409 EMAIL_ALREADY_IN_USE` sem sofrer alteração da conta ou das sessões. E-mail igual ao atual recebe `422 EMAIL_UNCHANGED`. Token inválido, expirado, substituído ou utilizado recebe `422 EMAIL_CHANGE_INVALID`.

O aviso ao endereço anterior não contém link de confirmação e não condiciona a troca. A API informa se o provedor aceitou seu envio; uma falha nessa etapa não desfaz a troca. Nenhum token é devolvido na resposta ou redirecionado para uma caixa diferente em demonstração. Nesse ambiente, a confirmação só pode ser enviada ao novo endereço se ele coincidir com o destinatário de teste configurado. Serviço desabilitado ou falha de envio do link retornam `503 EMAIL_CHANGE_DELIVERY_UNAVAILABLE`, sem alterar o e-mail da conta. O link aponta para `/confirmar-email` com o token no fragmento; a tela remove o fragmento da barra de endereço antes de enviar o token no corpo da confirmação.

## Validação do backend

No MySQL descartável, `prisma validate`, `prisma generate` e `prisma migrate deploy` passaram com as seis migrations. `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` não encontrou diferenças. Após incluir a exigência de arquivamento, o lint do backend e a suíte completa passaram: 471 testes, 0 falhas. A execução isolada permitiu somente o HTTP local do teste do SDK Gemini, sem acesso ao provedor.

O OpenAPI foi atualizado para as rotas novas e alteradas. O E2E usa a API e o banco locais, com o SDK de e-mail ligado a uma caixa fictícia em memória. Nenhum dado de demonstração foi usado. O envio efetivo por um provedor real não faz parte da validação.

No frontend, lint, testes (473/473) e build passaram. No pacote E2E, lint, as guardas (2/2) e a suíte Chromium (39/39) passaram. A suíte verifica os dois papéis, o uso único do link, o encerramento da sessão após exclusão, o bloqueio por histórico e a atualização após conflito. A revisão visual foi feita em claro e escuro no desktop e com viewport de celular; Firefox, Safari e leitor de tela não foram exercitados.
