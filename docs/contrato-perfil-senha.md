# Perfil e troca de senha — backend da #71

Válido para ALUNO e PROFESSOR autenticados. Esta entrega não altera as telas nem o AuthProvider do frontend. E-mail, papel, desativação de conta e edição de dados de outra pessoa ficam fora do contrato.

## Nome

`PATCH /api/auth/me`, com JSON contendo somente `{ "nome": "Nome Fictício" }`.

Mesmas regras do cadastro: trim, 2 a 120 caracteres e espaços consecutivos colapsados. Campos desconhecidos são rejeitados, não ignorados.

Resposta 200: `{ data: { usuario } }`, com `id`, `nome`, `email`, `papel`, `ativo`, `criadoEm`, `atualizadoEm`, como na consulta atual. Não retorna hash de senha ou versão interna da sessão. Não é necessário trocar o access token após alterar apenas o nome.

422 `VALIDATION_ERROR`: `error.details` contém itens `{ field, message }`. 401: autenticação inválida, conta inativa ou versão da sessão alterada antes da gravação. A gravação verifica essa versão novamente para impedir uso de uma requisição que já passou pelo middleware antes de uma troca de senha concorrente.

## Senha

`POST /api/auth/alterar-senha`, com JSON contendo somente `senhaAtual` e `novaSenha`.

A senha atual não é normalizada. A nova segue o cadastro: entre 10 e 72 caracteres, até 72 bytes UTF-8, com letra maiúscula, minúscula e número. Não registrar nem persistir as senhas recebidas; o banco recebe somente o hash bcrypt.

Resposta 200: `{ data: { usuario, accessToken } }`, além do novo refresh token em cookie HttpOnly com as mesmas opções de login/refresh. O refresh token nunca vai no corpo JSON.

Na mesma transação, o servidor:

1. trava o registro do usuário e confere versão da sessão e hash da senha contra a leitura que foi validada;
2. troca o hash e incrementa `sessaoVersao`;
3. revoga todos os refresh tokens antigos e invalida links de recuperação ainda não consumidos;
4. grava uma nova família de refresh para a sessão que fez a troca.

Todos os access tokens anteriores deixam de autenticar. A nova família separada impede que a tentativa de reutilizar um refresh antigo revogue a sessão nova. Se houver falha na persistência da nova sessão, senha e revogações são revertidas. Duas trocas concorrentes não sobrescrevem silenciosamente a senha vencedora.

Erros:

- 401 `AUTHENTICATION_REQUIRED`: sessão inválida/alterada, inclusive quando outra troca ou recuperação venceu a corrida; não repetir automaticamente;
- 422 `CURRENT_PASSWORD_INVALID`: senha atual incorreta, com detalhe por campo `senhaAtual`;
- 422 `VALIDATION_ERROR`: formato inválido, senha fraca ou campos extras;
- 429 `RATE_LIMIT_EXCEEDED`: dez tentativas por usuário em quinze minutos, incluindo sucessos. Não há repetição automática.

Senha incorreta ou validação rejeitada não alteram senha, sessão ou refresh. As rotas exigem access token válido; o identificador do usuário vem da autenticação, nunca do corpo.

## Integração com Lucas

Após sucesso na troca, instalar imediatamente `data.accessToken` na memória pela infraestrutura existente e atualizar os dados do usuário na sessão do frontend. Não salvar token ou senha em localStorage e não forçar logout no caminho feliz; o cookie renovado permite o refresh normal. Limpar os campos de senha após sucesso.

O AuthProvider atual não expõe uma ação específica para atualizar os dados da sessão a partir dessa resposta. Lucas deve alinhar a alteração desse arquivo compartilhado antes de integrar o formulário, em coordenação com a #49. Este backend não modifica o AuthProvider e não considera a experiência visual concluída.

Não substituir recuperação por e-mail por este fluxo: a pessoa precisa conhecer a senha atual. Nenhuma mensagem de e-mail é enviada pela edição de perfil ou troca autenticada. Não há migration ou nova dependência nesta entrega.
