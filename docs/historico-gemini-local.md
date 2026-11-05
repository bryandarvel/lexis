# Registro histórico local dos ensaios Gemini

Este conteúdo foi preservado das notas já existentes no checkout local. As chamadas, tempos, capturas e contagens abaixo NÃO foram reexecutados ou revalidados nesta consolidação; não constituem evidência de disponibilidade atual nem avaliação acadêmica. Descrevem o checkout da época, não necessariamente a dev ou esta branch. O prompt v4 de cobertura e a antiga alteração de modelo padrão são trabalhos separados, não incorporados automaticamente no controle de chamadas da #36. Para comportamento atual, consulte [operação do Gemini](operacao-gemini.md) e as verificações registradas no PR.

## Ensaio real autorizado em 15/10/2026

Foram executadas duas análises reais da mesma redação fictícia: uma pela API local e outra pela interface, separadas por vários minutos. Ambas receberam 429 / `too_many_requests` de Interactions. A API retornou HTTP 503 / `GEMINI_RATE_LIMITED` em menos de um segundo, com `Retry-After: 60`. Uma tentativa adicional imediatamente após a primeira foi recusada localmente com `GEMINI_COOLDOWN`, sem nova chamada ao Google. Os três registros fictícios de erro foram preservados no histórico.

A conferência visual confirmou progresso, botão desabilitado e contagem de espera, mensagem do serviço, identificação da análise anterior e manutenção dos destaques. A última conclusão continuou com três evidências literais localizadas (dois intervalos únicos, com sobreposição). As cinco notas permaneceram vazias e nenhum feedback foi criado ou publicado.

O painel do Google consultado após a primeira chamada exibia pico de 6/5 RPM, 9,22K/250K TPM e 12/20 RPD na janela de um dia. Esses valores agregados e sujeitos a atraso não identificam o limite exato de cada requisição. Os registros detalhados estavam desativados e não foram habilitados.

Com autorização específica, uma única chamada curta a `models.generateContent`, sem repetição, usando o mesmo modelo/chave, recebeu HTTP 200 em aproximadamente 2,1 segundos. O teste usou um limite pequeno de saída e não produziu texto final utilizável; comprova aceitação da chamada pelo endpoint, **não** uma análise completa nem evidências novas. A tentativa posterior em Interactions continuou bloqueada. Essa diferença sugere um problema específico de acesso/cota no caminho Interactions para esse projeto, mas o provedor não informou a métrica exata.

Naquele ensaio não houve troca do endpoint da aplicação, do modelo, de chave, de dependências ou de cobrança. Após autorização específica posterior, o cliente foi adaptado para `generateContent`, sem fallback, mantendo modelo e chave. O resultado da validação posterior está abaixo.

Durante a conferência, o cache do Vite ficou desencontrado após uma renderização SSR de verificação, causando 504 no módulo React. Somente o frontend foi reiniciado com `--force`, sem apagar arquivos versionados ou reinstalar dependências. React voltou a responder 200 e a página abriu normalmente. Futuras conferências SSR devem usar cache isolado do servidor de desenvolvimento.

## Validação completa após adaptação — 15/10/2026

Depois de 315 testes do backend e 75 do frontend aprovados, lint dos dois pacotes e build do frontend aprovados, foi solicitada **uma única análise real** pelo botão da correção no Chrome, usando exclusivamente a redação fictícia de demonstração já autorizada. Não houve repetição automática nem chamada a outro modelo/endpoint após falha.

A análise `d8f84a30-f19e-4b3e-b550-1d2b41186182`, iniciada às 22:19:41 UTC, foi persistida como `CONCLUIDA` em 28.098 ms com `gemini-3.6-flash` e sem erro. O JSON validado contém Legitimação, Pertinência e Uso produtivo, com uma evidência por critério. As três evidências foram localizadas e conferidas por `texto.slice(inicio, fim) === trecho` no banco. Os intervalos são 54–87, 54–140 e 141–209 (fim exclusivo), com sobreposição entre os dois primeiros.

Na interface foram confirmados: estado de processamento e botão desabilitado; conclusão com mensagem de sucesso; três destaques novos e sugestões editáveis; desaparecimento do aviso de resultado antigo. As cinco notas e o comentário geral permaneceram vazios, a redação continuou `ENVIADA` e nenhum feedback foi criado ou publicado. O histórico anterior foi preservado.

Essa execução comprova o fluxo técnico navegador → API → Gemini → validação → banco → interface no ambiente local. Não comprova disponibilidade permanente da cota, equivalência entre endpoints em outros projetos, nem qualidade pedagógica ou repetibilidade da análise; a avaliação acadêmica controlada continua sendo uma atividade própria. A métrica exata responsável pelo 429 anterior em Interactions não foi informada pelo Google.

Nesta etapa não foram feitos commit, push, abertura de PR ou merge. O trabalho permanece na branch `fix/36-controle-cota-gemini`; `main` não foi alterada.

## Sessão adicional após relato de instabilidade — 15/10/2026

O histórico confirmou três novos `GEMINI_SERVICE_UNAVAILABLE` e um `GEMINI_COOLDOWN` depois do ensaio anterior concluído. O status HTTP externo dessas falhas de serviço não é persistido no histórico atual; a mensagem genérica não permite atribuí-las com certeza a rede, indisponibilidade do Google ou outra resposta externa. Não foi inferida uma causa a partir apenas do print.

Foi criado um cenário novo na turma fictícia, sem sobrescrever trabalhos existentes: proposta `e78f594f-1bed-408b-bdf8-44a9fb103c61`, entrega do aluno2.demo `02202abe-f78a-4d38-a647-505edd6570cc`, texto fictício de 1.990 caracteres. Pelas rotas HTTP reais, passaram login, consulta da proposta, rascunho, envio, consulta pelo professor e bloqueios de rascunho privado (404), edição após envio (409) e chamada de IA por aluno (403). A única análise real da sessão retornou HTTP 201, foi persistida como `CONCLUIDA` em 45.467 ms e conservou a redação `ENVIADA`, sem criar feedback. Suas seis evidências literais válidas correspondem a dois intervalos únicos, cada um associado aos três critérios.

A automação do Chrome perdeu conexão; o usuário depois confirmou que conseguiu entrar e que via apenas destaques roxos. A leitura do componente identificou uma limitação visual independente da geração: `EssayEvidenceText.jsx` escolhe a cor de `relacionados[0]`, embora conserve os três vínculos e os nomes no rótulo acessível. Quando todos os critérios apontam para os mesmos intervalos, somente a cor de Legitimação aparece. Os quatro testes existentes de segmentação passaram, mas não cobrem uma apresentação multicolorida. A correção visual não foi implementada nesta sessão; essa parte continua pendente de decisão e validação.

Roteiro, texto fictício e relatório técnico desta sessão foram produzidos somente em `output/`, ignorado pelo Git. A preparação temporária está em `tmp/`, também ignorado. Não houve nova dependência, reset, migração, commit, push, PR ou merge.

## Revisão e diagnóstico com Gemini 3.8 Flash — 16/10/2026

Depois da troca de chave/modelo realizada pelo usuário, foi confirmado somente o nome do modelo local (`gemini-3.8-flash`) e a presença da chave, sem expô-la. A recomendação considera a versão estável, suporte a JSON estruturado e disponibilidade no nível gratuito Standard; qualidade pedagógica e cota efetiva continuam exigindo avaliação própria.

Com autorização explícita para o texto fictício da conta Carla, foi feita uma única análise real às 10:39:17 (America/Sao_Paulo). O Google retornou **HTTP 503**; o LÉXIS devolveu HTTP 502 / `GEMINI_SERVICE_UNAVAILABLE`, `details.statusExterno: 503` e `retryAfterSeconds: 30`. A tentativa foi persistida como `ERRO`, com duração de 1.838 ms. A redação continuou enviada, com texto preservado e sem feedback criado. Essa evidência confirma indisponibilidade externa nessa tentativa, mas não identifica retroativamente a causa dos erros anteriores nem comprova o motivo interno do 503. Não houve uma segunda chamada.

Foram concluídos 327 testes do backend e 79 do frontend, sem falhas ou cancelamentos, além de lint dos dois pacotes e build do frontend. As regressões incluem: rede/rejeição/503 com diagnóstico seguro, respeito ao prazo externo, pausa progressiva, recuperação após sucesso, aviso antigo de sucesso, resultado histórico datado e trecho associado às três cores. Os testes de componentes usam cache Vite temporário isolado do servidor aberto.

A conferência no Chrome confirmou a mensagem de indisponibilidade na Carla e, no Bruno, o resultado histórico preservado e o sublinhado com três cores para evidências compartilhadas. Foram produzidas capturas e relatório seguro em `output/evidencias/`, ignorado pelo Git. A disponibilidade real para uma nova conclusão com 3.8 permanece pendente após o 503 do provedor; testes simulados aprovados não significam geração real aprovada. Nenhum commit, push, PR ou merge foi feito.

## Revisão adicional do fluxo — 16/10/2026

Regressões reproduziram duas falhas de encerramento da tentativa: a preparação da solicitação estava fora do `try`, e a persistência final era retornada sem `await`, escapando do tratamento de rejeição assíncrona. A preparação passou para o bloco protegido e a conclusão agora é aguardada nele; se falharem, o serviço tenta registrar erro na tentativa atual e preserva a exceção original, sem repetir o Gemini ou tocar nas análises anteriores. Uma indisponibilidade completa do banco ou um encerramento abrupto do processo ainda pode impedir esse registro de falha; não foi implementado um recuperador de tarefas interrompidas.

Foram corrigidos também o prazo HTTP do limitador local e a apresentação de mensagens históricas com contagens antigas. Os novos testes falharam antes das correções e passaram depois. A execução inicial dos testes de rotas no sandbox encontrou `EACCES` ao conectar a portas locais; a repetição com permissão apropriada passou. Não foi alterada a autenticação nem enfraquecida uma asserção para contornar essa restrição.

Após as correções: **329 testes do backend** (59 suítes) e **81 testes do frontend**, sem falhas ou cancelamentos, lint dos dois pacotes e build do frontend aprovados. `git diff --check` passou. A conferência de leitura no Chrome confirmou data da tentativa, identificação da conclusão anterior, três vínculos de critério e ausência da antiga espera relativa de 86.373 segundos. Captura em `output/evidencias/revisao-historico-gemini-2026-10-16.png`. Não houve chamada real ao Gemini nesta revisão, alteração de dados da demonstração, commit, push, PR ou merge; o ensaio real anterior segue pendente de conclusão após o HTTP 503 externo.

## Cobertura de repertórios relatada pelo usuário — 16/10/2026

A leitura da redação fictícia do novo print (`f2ff5c99-370e-4152-8583-f49e4ada88c5`) identificou uma conclusão 3.8 com o prompt v3, anterior à tentativa com erro das 11:16. Os três critérios estavam presentes no JSON. Legitimação continha duas evidências; Pertinência e Uso produtivo continham uma evidência cada, com o mesmo intervalo. Todas as quatro associações eram literais válidas, formando três intervalos únicos. Não houve descarte desses trechos pelo frontend.

Houve cobertura incompleta da saída: Hannah Arendt e Marco Civil foram citados no diagnóstico de Legitimação, mas não vieram acompanhados de evidência literal; Black Mirror não constava nos diagnósticos/evidências. A proposta vinculada continha textos aleatórios, e o usuário confirmou que foram digitados assim para teste. Não era um problema de codificação. A avaliação de Pertinência precisa de um enunciado real; o cadastro existente não foi alterado.

O prompt passou a `analise-redacao-v4-cobertura-repertorios`: leitura de todos os parágrafos, consideração de referências acadêmicas, legais e culturais/audiovisuais, evidências dos repertórios discutidos em cada diagnóstico, diferenciação entre identificação e verificação externa, exame de usos insuficientes e declaração de limitação quando a proposta não permite avaliar Pertinência. Permanece o teto existente de oito evidências por critério, sem quantidade mínima forçada, busca de nomes por lista fixa, marcação fabricada ou múltiplas chamadas ao modelo.

A interface passou a exibir uma legenda com quantidade de intervalos verificados por critério e a explicar que os números identificam trechos, não critérios. Evidências compartilhadas continuam com todas as cores relacionadas. O resultado v3 salvo permanece intacto; a mudança do prompt só pode ser avaliada em uma nova geração concluída.

Passaram **330 testes do backend** e **82 do frontend**, lint e build. As novas regressões usam respostas simuladas com repertórios em diferentes parágrafos para verificar que o contrato e a tela preservam essas evidências e admitem um critério sem marcação. Isso **não comprova melhoria pedagógica, recall ou cobertura do Gemini real**. Não houve nova chamada ao provedor nesta etapa; ainda é necessário testar o v4 em uma proposta definida, com referências conferidas pelo professor. Esses ajustes de cobertura foram solicitados depois do escopo inicial da Issue #36 e precisam ser contemplados na organização das Issues/PRs antes de publicar o trabalho.
