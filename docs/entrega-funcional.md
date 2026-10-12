# Entrega funcional do LÉXIS

Registro de implementação iniciado em 11/10/2026. Trabalho técnico realizado em `feat/bryan-frontend`; alterações visuais preexistentes preservadas. A verificação técnica terminou antes do versionamento. Em 12/10/2026, o usuário autorizou Issue, commits e push, preparados em `feat/20-entrega-funcional`, vinculada à [Issue #20](https://github.com/bryandarvel/lexis/issues/20). PR e merge serão feitos somente em etapa posterior; não há autorização nesta etapa para alterar `main`, PRs do Lucas ou realizar deploy.

O inventário de caminhos modificados/novos e a divisão sugerida para revisão estão em [arquivos-entrega-funcional.md](arquivos-entrega-funcional.md).

## Sequência

1. Contrato de critérios e compatibilidade histórica.
2. Recuperação de senha e sessões.
3. Integrações reais e operação do e-mail.
4. Fluxos completos, acessibilidade, dependências e observabilidade.
5. Protocolo acadêmico e revisão das evidências.

## Critérios e propostas antigas

A criação e a substituição de critérios exigem Legitimação, Pertinência e Uso produtivo, nessa ordem, com os nomes e descrições do modelo canônico, seguidos de zero a dois personalizados. Duplicações também são rejeitadas quando diferem apenas por caixa, acento ou espaços. Não existem pesos. O servidor valida as requisições e os caminhos de persistência.

Leitura inicial local somente de metadados encontrou sete propostas, seis congeladas, duas compatíveis com a base atual e cinco legadas. Quantidades de critérios observadas: um, dois, três e cinco. Nenhum registro histórico foi convertido ou apagado; posteriormente foi criada uma proposta nova, exclusivamente fictícia, para a verificação pela interface.

Propostas legadas continuam consultáveis e utilizáveis com seus critérios históricos. A substituição de critérios legados é recusada (`LEGACY_CRITERIA_REVIEW_REQUIRED`); propostas congeladas preservam o bloqueio existente. Para adotar a base atual, crie uma nova proposta. Uma eventual migração deve ser aprovada separadamente, inventariar IDs e dependências, exportar backup, preservar snapshots de análises/feedbacks e prever restauração. Não há migração automática dos critérios.

## Evidências em andamento

Os resultados finais de testes, verificações externas e navegador serão registrados após execução. Código existente e testes simulados não comprovam disponibilidade externa.

### Recuperação de senha

Implementados solicitação genérica, fila, token aleatório de 32 bytes, persistência somente do hash SHA-256, validade configurável (30 minutos por padrão), tela de redefinição e consumo transacional de uso único. Duas tentativas simultâneas têm apenas um vencedor. A redefinição incrementa a versão de sessão e revoga os refresh tokens; access tokens antigos passam a ser recusados. A autenticação consulta o estado da conta no servidor.

A migration `20261011000100_recuperacao_senha` foi aplicada somente aos bancos locais `lexis` e `lexis_test`. Ela adiciona estrutura e versão de sessão, sem converter propostas históricas ou trocar senhas existentes.

### Verificações executadas em 11/10/2026

- Backend: lint sem avisos/erros; suíte completa com **251 testes aprovados, zero falhas e zero cancelados**, repetida após as atualizações de dependências em 12/10/2026. Inclui os casos de token inválido, expirado, usado, concorrência, revogação de sessão e falha simulada de envio. Verificação unitária isolada também passou com 108 testes.
- Frontend: lint, **54 testes aprovados** e build executados com sucesso após as atualizações, correção de contraste, upload multipart e mensagem de revisão linguística desativada. A verificação completa no navegador ainda está em andamento.
- Resend: uma mensagem neutra, sem dados de alunos ou link de recuperação, foi enviada ao `EMAIL_DEMO_RECIPIENT` autorizado. A API aceitou a mensagem em `2026-10-11T20:03:01.762Z`, identificador `01a12c8f-bf76-78c6-b066-97ace9b37f76`. O destinatário confirmou o recebimento na caixa de entrada nesta conversa. A fila não foi acionada; esse teste não comprova o fluxo completo de recuperação por e-mail.
- O ambiente local mantém `EMAIL_ENABLED=false` e LanguageTool desativado. O teste isolado do Resend não alterou essas configurações.

Consulte [operacao-email.md](operacao-email.md) para habilitar e operar a demonstração de forma controlada.

### Integrações: evidência real e limites

| Integração | Implementação e simulações | Chamada real | Interface |
| --- | --- | --- | --- |
| Gemini | Cliente, rota, prompt e validação de resposta; testes de contrato, timeout, limite e erros aprovados | Uma chamada com redação fictícia do seed concluiu em 43.217 ms, modelo configurado `gemini-3.6-flash`; resultado validado e salvo | Solicitação, progresso, consulta do resultado, três critérios e evidências observados. Nenhuma nota preenchida/publicada pela IA |
| OCR.space | Upload, extração e revisão em duas fases; testes de limites, autorização e imutabilidade aprovados | Imagem fictícia de 22.430 bytes: extração de 233 caracteres, código 1, 3.670 ms, em `2026-10-12T13:22:09.496Z`, pelo cliente backend; extração posterior pela interface também funcionou | Seleção manual, extração, revisão obrigatória, salvamento e envio confirmados no Chrome e nos metadados do banco; editor somente para leitura após entrega |
| LanguageTool | Cliente opcional e falha aberta; testes de timeout, limite, preservação e aplicação somente por escolha aprovados | Configuração local desativada; verificação local retornou `DESATIVADO`, sem chamada externa. Serviço habilitado real ainda não comprovado | Editor informou explicitamente que o serviço está desativado e permitiu salvar/enviar a redação |
| Resend | Cliente, fila de notificações e fila de recuperação; testes simulados aprovados | Mensagem neutra recebida na caixa de entrada; depois, uma solicitação de recuperação autorizada foi processada e enviada | Usuário confirmou redefinição pelo link; banco confirmou consumo e invalidação de sessões. Diálogo com envio temporariamente habilitado retornou mensagem genérica e HTTP 202 sem disparar outro e-mail |

O teste do Gemini revelou timeout de 40 segundos no frontend, menor que a chamada real de 43,2 segundos. A chamada passou no backend, mas a interface mostrou falha. Os pedidos de IA agora têm 200 segundos e os de OCR 140 segundos, acima dos respectivos máximos configuráveis do servidor (180 e 120 segundos), com margem para transporte. Após interrupção, é possível consultar o resultado existente sem nova chamada ao modelo. Essa consulta recuperou o resultado real na interface. A tentativa posterior com prazo corrigido recebeu limite temporário em 34.864 ms; o novo caminho de sucesso acima de 40 segundos não foi comprovado por uma segunda chamada real. A configuração de prazos tem teste de regressão.

O teste do OCR pela interface identificou herança do cabeçalho JSON do cliente HTTP, que convertia o FormData e impedia o recebimento do arquivo pelo servidor. Corrigida a configuração desse pedido para remover o padrão JSON e deixar o navegador gerar multipart e boundary. O teste de regressão usa o Axios real com adapter simulado e comprova que o arquivo permanece em FormData. A confirmação nativa do Chrome apresentou falhas de controle pela automação; foi solicitado ao usuário iniciar a extração na aba do editor.

Evidência local da correção: `output/evidencias/gemini-real-correção.png`, ignorada pelo Git. Os nomes, conta e redação mostrados pertencem ao seed fictício.

### Observabilidade

Logs JSON em stdout registram identificador próprio de requisição, método, status, duração e códigos de falha, usando lista positiva. Corpos, headers, URL completa, usuários e mensagens brutas de exceções não são serializados. O ORM emite eventos resumidos, sem imprimir sua mensagem bruta; falhas de e-mail persistem códigos conhecidos. Erros inesperados retornam mensagem genérica também em desenvolvimento. `X-Request-Id` permite correlacionar uma resposta com os registros. Não foram instalados agentes externos de monitoramento.

### Acessibilidade: verificação parcial

- Login: idioma `pt-BR`, um título principal, campos com rótulos e autocomplete, botões com nome acessível e ausência de rolagem horizontal na largura efetivamente observada de 431 pixels.
- Recuperação: foco inicial no campo de e-mail; Escape fecha o diálogo e devolve o foco a “Esqueci minha senha”; mensagem de indisponibilidade anunciada como alerta.
- Correção: painel móvel com diálogo/abas observado; três colunas observadas em 1440 pixels; trechos acessíveis como botões, notas humanas vazias e sugestões editáveis.
- Corrigido contraste dos avisos de autenticação no tema claro: texto `#991b1b` sobre `#fef2f2`, razão medida 7,5966:1. Avisos de sucesso e tema escuro receberam cores próprias; verificação completa de seus contrastes ainda pendente.

Em 12/10/2026, o aviso de link inválido/ausente da redefinição também foi observado no Chrome. No tema escuro, o contraste medido do aviso foi 10,2529:1 (`#fecaca` sobre `#451a1a`).

No Chrome, o editor foi medido com viewport de 320 pixels: a barra vertical deixava 312 pixels de área útil, enquanto `min-width: 320px` gerava 8 pixels de rolagem horizontal. Removida essa largura mínima rígida de `html`/`body`, documento e área útil passaram a medir 312 pixels, sem transbordamento horizontal. Ambos os campos (texto e imagem) possuem rótulos nativos associados; o campo de arquivo usa rótulo implícito.

Critérios usados como referência para estes checks: WCAG 2.2, 1.3.1 (estrutura/rótulos), 1.4.3 (contraste), 1.4.10 (refluxo), 2.1.1 (teclado), 2.4.3/2.4.7 (foco), 3.1.1 (idioma), 4.1.2/4.1.3 (nome/papel e mensagens). Não há declaração de conformidade WCAG completa. Ampliação, todos os breakpoints e leitor de tela ainda precisam de verificação. O override de 320 pixels no navegador integrado não se refletiu na largura observada; esse tamanho não foi marcado como validado.

### Protocolo acadêmico

Foi preparado [protocolo-academico-ia.md](protocolo-academico-ia.md), com autorização do corpus, desidentificação, avaliadores independentes, adjudicação, métricas, registro e limites. O harness executou dois casos em modo fixture com sucesso, sem chamadas externas. Esses resultados não medem qualidade real do Gemini. Corpus autorizado, avaliadores e aprovação do desenho metodológico continuam pendentes da equipe.

### Dependências

Atualizações compatíveis reduziram os alertas de 13 para 6 no backend e de 2 para zero no frontend. Consulte [seguranca-dependencias.md](seguranca-dependencias.md) para pacotes e limitações do adapter/Prisma. Os lockfiles foram alterados intencionalmente; não houve troca de versão principal ou comando `--force`.

## Decisões ainda externas ao núcleo

As APIs de renomear/arquivar turma, regenerar código, listar/desvincular alunos, editar/arquivar proposta e sair da turma já existem; a inclusão desses controles na interface não foi aprovada nesta meta. ADMIN, consulta ao feedback, histórico navegável de IA, edição de perfil e seleção de critérios por redação continuam fora do escopo.

| Ação de gestão | API/cliente | Controle conectado na interface atual |
| --- | --- | --- |
| Renomear turma | Existe | Pendente |
| Arquivar turma | Existe | Pendente |
| Regenerar código | Existe | Pendente |
| Listar matrículas/alunos para gestão | Existe | Pendente; contagens e alunos com entregas não equivalem à listagem de matrículas |
| Desvincular aluno | Existe | Pendente |
| Editar conteúdo/prazo da proposta | Existe | Pendente |
| Editar critérios personalizados | Existe | Conectado em proposta compatível e ainda não congelada |
| Arquivar proposta | Existe | Pendente |
| Aluno sair da turma | Existe | Pendente |

Inventário confirmado pela busca dos consumidores dos clientes em `frontend/src`. Nenhum dos controles pendentes foi acrescentado nesta entrega.

## Recuperação real com participação do usuário

Após autorização adicional, foi enviada uma solicitação da conta fictícia `aluno1.demo@lexis.example.com` ao destinatário de demonstração. A fila foi conferida vazia antes e limitada a uma solicitação; notificações não foram processadas. O serviço de solicitação/processamento foi habilitado apenas nessa execução isolada, sem alterar `EMAIL_ENABLED=false` do ambiente geral.

Resultado: uma processada, uma enviada, zero erros. Envio registrado em `2026-10-12T13:33:31.485Z`; expiração em `2026-10-12T14:03:30.417Z`. O usuário abriu o e-mail e confirmou “Senha redefinida com sucesso”. Depois disso, a consulta de metadados confirmou `sessaoVersao=1`, solicitação consumida e zero refresh tokens ativos. Recarregar o editor no Chrome exigiu novo login. Nenhuma senha, token ou link completo foi gravado neste relatório.

A regra da automação de navegador exige que o usuário preencha/submeta a nova senha. Essa etapa foi realizada por ele; o agente verificou os efeitos persistidos. Falhas e concorrência foram verificadas pelos testes automatizados em banco de teste.

A senha conhecida antiga do seed foi recusada no Chrome após a redefinição. O usuário entrou com a nova senha e o painel/editor do aluno foram observados novamente. A permissão de upload informada como habilitada ainda não foi reconhecida pela extensão; seleção manual da imagem fictícia foi solicitada como alternativa.

## Estado da entrega

| Etapa | Estado atual |
| --- | --- |
| Inspeção e preservação | Concluída; diferenças locais preexistentes preservadas |
| Critérios no servidor e compatibilidade | Implementados e testados; nenhuma conversão histórica |
| Recuperação de senha | Implementada/testada; diálogo genérico, envio real autorizado, redefinição e revogação de sessões confirmados |
| Gemini | Chamada real concluída anteriormente, consulta e evidências observadas; nova tentativa após ajuste do prazo respondeu limite temporário, corretamente exibido, sem repetição |
| OCR | Chamada real e fluxo no Chrome comprovados: extração, revisão obrigatória, salvamento e envio; editor somente para leitura após entrega |
| LanguageTool | Comportamentos desativado e falha aberta verificados; instância real habilitada não disponível na configuração atual |
| Ações de gestão | Inventariadas; controles adicionais aguardam decisão de escopo |
| Fluxos completos de aluno/professor | Envio, correção, publicação, consulta do feedback, notificação, criação de turma/proposta e edição de critério confirmados |
| Acessibilidade | Verificação delimitada realizada: contraste, estrutura/rótulos, teclado/foco, três larguras e ampliação de 200% no feedback; sem certificação completa nem leitor de tela |
| Observabilidade | Implementada e testada |
| Dependências | Revisadas; correções compatíveis aplicadas, seis alertas transitivos restantes documentados |
| Protocolo acadêmico | Preparado; corpus, avaliadores e aprovação pendentes da equipe |

A seleção manual do arquivo contornou a limitação da extensão; envio, correção/publicação pelo professor e consulta pelo aluno foram comprovados nas etapas abaixo. Nenhum commit, push, PR, merge ou deploy foi realizado.

## OCR: entrega confirmada pela interface e pelo banco

O usuário selecionou a imagem fictícia no Chrome, acionou a extração e confirmou a substituição do editor. A interface exigiu revisão e manteve o envio bloqueado até a confirmação do texto revisado. Depois de revisar, o rascunho foi salvo no servidor. O usuário acionou e confirmou o envio definitivo; a interface exibiu sucesso e o campo ficou `readOnly=true`.

Consulta restrita aos metadados da redação fictícia confirmou `status=ENVIADA`, `origemTexto=OCR`, revisão em `2026-10-12T13:55:45.745Z` e envio em `2026-10-12T13:59:37.455Z`. A entrega foi registrada com atraso, pois o prazo da proposta de demonstração já havia passado. Evidências locais: `output/evidencias/ocr-revisao-pendente.png` e `output/evidencias/ocr-redacao-enviada.png`.

A revisão linguística opcional foi acionada pela interface com o serviço desativado. Foi corrigida a mensagem que anteriormente poderia sugerir revisão bem-sucedida sem uma chamada: agora informa explicitamente a indisponibilidade e permite salvar/enviar normalmente. Após essa correção, os testes completos do frontend passaram: 54 testes, zero falhas e cancelamentos; lint e build também passaram.

## Correção da nova entrega fictícia

A redação recém-enviada apareceu na fila do professor e foi aberta pela interface. Uma nova chamada ao Gemini recebeu limite temporário; o registro ficou `ERRO`, duração 34.864 ms, modelo `gemini-3.6-flash`. A interface exibiu o limite e ofereceu consulta ao resultado existente. Não foram feitas novas tentativas. Esse resultado comprova o tratamento de limite real, não uma segunda análise bem-sucedida nem o caminho de sucesso acima de 40 segundos.

As cinco notas continuaram vazias após a solicitação de IA. Em seguida foram preenchidos valores exclusivamente fictícios para testar a correção humana (total 520), comentário geral explicitamente de teste e um comentário de Legitimação. A ação Salvar exibiu sucesso e a consulta de metadados confirmou versão 1 `RASCUNHO`, `publicadoEm=null`, com redação ainda `ENVIADA`. Evidência: `output/evidencias/correcao-rascunho.png`.

O usuário acionou Publicar e confirmou o aviso. A interface exibiu “Correção publicada. O aluno foi notificado no sistema.”. A consulta dos metadados confirmou `status=AVALIADA`, versão 1 `PUBLICADA`, total 520, publicação em `2026-10-12T14:07:49.366Z` e uma notificação associada. Evidência: `output/evidencias/correcao-publicada.png`. Nenhum worker de e-mail foi acionado nessa publicação.

## Turma, proposta e verificações adicionais de acessibilidade

Pela interface do professor, foi criada a turma exclusiva de demonstração “Verificação funcional — fictícia 12/10” (`ef869858-3d92-42ba-b7c3-70755ebd535c`). Foi criada a proposta “Proposta fictícia — verificação dos critérios” (`c693978b-4388-4e45-b019-c079df9d6088`), prazo 30/10/2026 23:59, três critérios fixos e dois personalizados. O prazo exigiu preenchimento manual do usuário por limitação da automação do controle nativo; não houve alteração do componente para contornar o teste.

O terceiro personalizado ficou bloqueado na criação e no detalhe. A descrição de Contextualização foi editada pelo modal e reapareceu atualizada com mensagem de salvamento. Nenhuma proposta histórica foi editada. Evidência: `output/evidencias/proposta-cinco-criterios.png`.

Proposta e correção foram medidas no Chrome com viewport de 320, 768 e 1280 pixels. Documento e área útil coincidiram, sem rolagem horizontal (312, 760 e 1272 pixels, respectivamente, por causa da barra vertical). No painel móvel de correção, Enter abriu o diálogo, ArrowLeft mudou a aba e o foco para Comentários, Escape fechou o diálogo e devolveu o foco ao botão “Comentários e critérios”. Os overrides foram removidos após a verificação. Esses checks ampliam a evidência de refluxo e teclado; ampliação real do navegador e leitor de tela ainda não foram comprovados.

## Feedback recebido e ampliação real

Depois de entrar novamente na conta fictícia do aluno com a senha redefinida, o painel mostrou uma correção disponível e um aviso não lido. O feedback exibiu versão 1 publicada, total 520, notas 120/80/120/120/80, comentário geral e comentário de Legitimação correspondentes ao preenchimento humano de teste. O texto entregue permaneceu disponível. Evidência: `output/evidencias/feedback-aluno-publicado.png`.

O aviso foi aberto por Enter e direcionou ao feedback; o contador passou a zero. A consulta restrita ao banco confirmou `lidaEm=2026-10-12T14:15:35.415Z`, e-mail `PENDENTE` e zero tentativas. Isso comprova leitura da notificação, não um registro específico de consulta do feedback.

Uma tentativa de entrar na nova turma fictícia foi recusada com mensagem clara porque o aluno já possuía uma turma ativa. Nenhum vínculo foi removido para contornar essa regra. A matrícula bem-sucedida pelo código continua coberta pelos testes repetíveis, não por essa tentativa no navegador.

O usuário ajustou o Chrome para 200%. A largura CSS caiu de 1536 para 768 pixels e o DPR subiu de 1,25 para 2,5; documento e área útil mediram 760 pixels, sem rolagem horizontal no feedback. Títulos e notas continuaram disponíveis. Evidência: `output/evidencias/feedback-zoom-200.png`. Depois, o usuário retornou a 100%. Essa verificação é específica desse fluxo e não comprova ampliação de todas as telas. Leitor de tela não foi verificado neste ambiente.

## Diálogo de solicitação com envio habilitado

Uma API temporária em loopback na porta 3001 e frontend na porta 5174 receberam configuração apenas em memória (`EMAIL_ENABLED=true`), sem editar `.env` e sem iniciar workers. Foi confirmado que o endereço fictício `recuperacao-inexistente.demo@lexis.example.com` não estava cadastrado. O diálogo Esqueci minha senha enviou a solicitação, recebeu HTTP 202 e mostrou “Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.”.

O total de solicitações de recuperação continuou em uma, com zero pendentes: nenhuma solicitação ou mensagem extra foi criada. Isso verifica o estado de sucesso genérico sem permitir enumeração do cadastro; não representa um segundo envio real. Evidência: `output/evidencias/recuperacao-solicitacao-generica.png`. Os servidores temporários foram encerrados após o teste.

## Auditoria de encerramento técnico — 12/10/2026

| Requisito da meta | Evidência e resultado |
| --- | --- |
| Inspecionar e preservar | Branch `feat/bryan-frontend`, diff revisado e mudanças visuais preexistentes preservadas; nenhum arquivo preparado para commit |
| Base fixa, extras e compatibilidade | Schema/repository/OpenAPI e testes de criação/edição, duplicação, pesos e bypass; criação e edição fictícias pela interface; históricos não convertidos |
| Recuperação e sessões | Testes de inválido/expirado/reutilizado, concorrência, falha de envio, login/refresh concorrentes; e-mail real autorizado, redefinição pelo usuário, recusa da senha antiga e nova sessão; diálogo genérico real |
| Gemini | Resposta real estruturada e persistida, três critérios e evidências na interface; consulta sem nova chamada; progresso e limite real observados; timeout/erros cobertos por simulações e prazos corrigidos |
| OCR | Extração real, revisão/salvamento obrigatórios, entrega pelo usuário e imutabilidade confirmadas em UI/banco; limites/falhas/autorização testados |
| LanguageTool | Serviço desativado informado corretamente na UI; revisão opcional e falha aberta nos testes; não há comprovação de instância real habilitada |
| Resend e fila | Duas mensagens especificamente autorizadas recebidas, recuperação processada em lote de um; testes de reserva/idempotência/falhas; operação supervisionada documentada, nenhum agendamento ativado |
| Gestão | Inventário de controles existentes e pendentes; nenhuma funcionalidade adicional não aprovada implementada |
| Fluxos completos | Login, painel, turma/proposta, edição de critério, OCR/envio, correção em rascunho, publicação, feedback do aluno e leitura da notificação observados; regras de isolamento e matrícula cobertas pela suíte |
| Avaliação acadêmica | Harness/fixture inspecionados, dois casos técnicos executados sem chamadas reais; protocolo entregue; corpus/avaliadores/aprovação continuam externos, sem resultados científicos inventados |
| Acessibilidade | Checks DOM, contraste, teclado/foco, refluxo e ampliação descritos acima; nenhuma alegação de conformidade total; leitor de tela não operado pelo ambiente de automação disponível |
| Observabilidade/dependências | Logs com lista positiva e testes contra vazamento; atualizações compatíveis; seis alertas transitivos remanescentes explicitados, sem downgrade forçado ou atualização principal |
| Verificação final | Backend: lint e nova suíte completa, 251/251, 55 suítes, zero falhas/cancelamentos, 75.296,5225 ms. Frontend: lint, 54/54 e build, todos com exit code 0. `git diff --check` sem erros; somente avisos de normalização LF/CRLF |
| Entrega e operação | Este relatório, inventário de arquivos, protocolo acadêmico, operação de e-mail, README e revisão de dependências; screenshots locais ignorados pelo Git |

O núcleo técnico e os testes autorizados foram entregues. Permanecem limitações explicitamente registradas: disponibilidade/cota do Gemini (segunda tentativa limitada), instância real de LanguageTool, corpus e avaliadores, seis alertas transitivos, auditoria de acessibilidade ampliada e controles de gestão ainda sem aprovação. Não foi declarado que esses itens externos ou futuros estão implementados/validados. A demonstração mantém `EMAIL_ENABLED=false`; a equipe deve habilitar e supervisionar a fila quando decidir usá-la, conforme `operacao-email.md`.

Na etapa técnica anterior, nenhum commit, push, pull request, merge ou deploy foi realizado. Nenhuma proposta histórica nem vínculo de aluno foi removido. A autorização posterior de Issue, commits e push está registrada no início deste documento; a integração por PR/merge continua separada.

## Integração com a dev — Issue #20

Após autorização posterior, a dev incorporou os PRs #22 (CI), #17 (fundação visual) e #19 (painel do aluno), sempre por merge commit, com CI verde e sem alterar main. A entrega desta Issue foi combinada localmente com essa dev antes de abrir seu PR.

A combinação não gerou conflitos de Git. Os testes de desempenho, porém, precisaram adotar a base canônica de três critérios e a injeção do autenticador de teste usada pelos demais testes isolados. O router mantém o autenticador real como padrão; os testes com banco continuam verificando sessões reais e isolamento entre alunos. Nenhum teste ou proteção foi removido.

Verificação local da combinação: sete testes focados aprovados; backend lint e suíte completa de 265 testes/59 suítes, zero falhas/cancelamentos; frontend lint, 64 testes e build aprovados. Essas contagens substituem as anteriores somente para a versão combinada. O CI remoto do PR final ainda deve ser confirmado antes do merge.

CONTRIBUTING e README passaram a orientar tarefas e atualizações pela dev. O procedimento para Bryan e Lucas está em [atualizacao-dev.md](atualizacao-dev.md), incluindo dependências e migration local, sem apagar dados ou sobrescrever `.env`.
