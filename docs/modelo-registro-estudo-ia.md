# Registro do estudo de IA — modelo em branco

Estado inicial: **PENDENTE / NÃO LIBERADO PARA EXECUÇÃO REAL**. Este arquivo não constitui consentimento, protocolo aprovado, autorização institucional, anotação humana ou resultado. Copiar para local privado com acesso definido; não devolver ao Git a versão preenchida com dados identificáveis, textos, autorizações ou resultados individuais.

## 1. Decisão antes de coletar/analisar

| Campo | Preenchimento necessário |
|---|---|
| Código/versão do protocolo | PENDENTE |
| Objetivo, população e limites de generalização | PENDENTE; estudo exploratório não equivale a validação populacional |
| Autores, orientador e revisão metodológica | PENDENTE; registrar papéis e evidência da decisão, não presumir aval |
| Rubrica operacional dos três critérios | PENDENTE; exemplos de acerto/insuficiência/ausência/inconclusão definidos antes |
| Regras de inclusão/exclusão e amostragem | PENDENTE; extensão, temas, tipos de repertório e níveis de desenvolvimento |
| Quantidade de calibração e de avaliação final | PENDENTE; justificar; não usar o limite técnico de 20 como tamanho científico |
| Métricas, denominadores, convenções de null/zero e limiares | PENDENTE; separar contrato técnico, evidências e utilidade pedagógica |

## 2. Proveniência, autorização e privacidade

Para cada fonte/conjunto, registrar fora do Git: origem e versão, responsável, finalidade, condições de uso/licença, autorização de armazenamento e **envio ao provedor**, evidência privada dessa autorização e decisão institucional aplicável. “Disponível na internet” não preenche esses campos. Textos de menores ou situações sensíveis exigem orientação institucional antes de coletar, sem presumir que este modelo resolve a questão.

Definir responsável e local de guarda, pessoas com acesso, proteção de acesso/backups, período/critério de retenção e procedimento de exclusão. Separar eventual mapa de identificação dos textos enviados. Fazer revisão manual de nomes, contatos, instituições, locais e referências que possam identificar o autor; desidentificação não é uma garantia automática de anonimato.

Não incluir uma lista pública de participantes/consentimentos. Usar códigos de casos sem significado pessoal; o conteúdo também pode identificar alguém e precisa de revisão.

## 3. Manifesto e referências humanas

Registrar por caso: código único, origem autorizada, hash da versão exata do texto/enunciado, extensão, grupo calibração/avaliação e status da revisão de privacidade. Não normalizar ou editar texto após fixar os offsets; uma nova versão exige novo hash/anotação. Conferir duplicatas de caso/texto e justificar qualquer repetição planejada.

Bryan/Lucas estão previstos como avaliadores preliminares, não automaticamente como referência independente validada. Registrar qualificação/treinamento, participação no desenvolvimento, conflitos e eventual avaliador externo. Calibrar em textos separados. Cada avaliador anota sem ver a saída do modelo nem a marcação do outro; guardar originais antes da adjudicação.

Anotação por evidência: critério, inicio/fim UTF-16 (fim exclusivo), trecho literal e justificativa. Registrar ausência de evidência, ambiguidade, uso insuficiente e necessidade de conferência externa. Validar limites e `texto.slice(inicio,fim) === trecho`; eliminar/justificar duplicata do mesmo intervalo/critério. A referência adjudicada não substitui os registros independentes nem sua concordância prévia.

O harness espera `casos[].referenciaHumana.evidencias[{criterioOrdem,inicio,fim,trecho}]`, além de id/tema/texto/criterios. A validação atual não é um gerenciador de consentimentos nem garante sozinha todas as verificações do manifesto. Não rotular evidência gerada por IA como humana.

## 4. Plano de execução e orçamento

| Campo | Estado inicial |
|---|---|
| Corpus privado autorizado e hash final | PENDENTE |
| Commit, prompt, modelo efetivo e parâmetros | PENDENTE; alias/modelo não deve ser inferido de ensaio antigo |
| Número de casos/repetições e ordem | PENDENTE; separar calibração do conjunto final |
| Máximo total de chamadas, tokens e custo | PENDENTE; quota gratuita não é garantia de acesso nem orçamento controlado pelo harness |
| Coordenação Bryan/Lucas, intervalo e demais consumidores do projeto | PENDENTE; controle em memória não é distribuído |
| Tratamento de 429/503/timeout/resposta inválida/recusa local | PENDENTE; registrar tentativas e casos não processados, sem apagar fracassos |
| Repetição permitida e critério de parada | PENDENTE; não adicionar retries automáticos por iniciativa própria |
| Diretórios únicos de saída e retenção | PENDENTE; latest.json/md são sobrescritos no diretório escolhido |

Nenhuma chave, token, URL com credencial ou conteúdo pessoal deve aparecer no registro público. O modelo não atribui nota; concordância de notas não é métrica aplicável à saída atual. Oito evidências por critério é um teto do contrato, não promessa de cobertura exaustiva.

## 5. Liberação e relatório

Somente depois dos campos resolvidos: registrar quem autorizou cada dimensão (uso/envio dos textos, método, orçamento e chamada real), data e evidência privada, além da autorização específica de execução. Não marcar caixa como aprovada apenas porque a automação foi autorizada a escrever documentos.

No relatório, separar respostas estruturadas válidas, falhas de integração/limite, correspondência das evidências e avaliação pedagógica humana. O resumo atual calcula agregados e média de latência; análise por tema/critério, concordância humana, incerteza e rubrica pedagógica exigem trabalho próprio aprovado. Preservar a convenção dos denominadores/null e registrar limitações de amostra, desenvolvedores como avaliadores, erros de referência e mudanças de modelo.

Fixture técnica, demonstração fictícia e teste automatizado não preenchem os campos de corpus autorizado ou resultado científico. Até a liberação: **não executar modo real nem enviar corpus ao Google**.
