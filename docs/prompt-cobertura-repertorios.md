# Prompt v4: cobertura de repertórios — #100

Esta alteração transporta o prompt já existente no checkout local preservado para uma tarefa própria. Não muda modelo, chave, parâmetros de geração, JSON Schema, limites de evidências ou número de chamadas. O controle de consumo da #36 é separado.

O prompt `analise-redacao-v4-cobertura-repertorios` orienta leitura integral, consideração de referências acadêmicas, legais, culturais e audiovisuais em todos os parágrafos, e coerência entre diagnóstico e evidência literal. Não contém lista fixa de autores, não exige uma quantidade mínima de marcações e não promete localizar todos os repertórios.

Há no máximo oito evidências por critério, como no schema existente. A mesma evidência pode apoiar critérios diferentes; um critério sem suporte textual pode ter lista vazia. O modelo deve declarar limitações de cobertura, inconclusão temática quando a proposta não tem sentido identificável e referências que exigem conferência externa. Identificar um nome no texto não verifica a fonte ou a exatidão da afirmação.

O conteúdo da redação continua sendo dado não confiável. A IA não atribui nota nem publica feedback. O servidor conserva a validação estrita e a conferência literal dos offsets; o professor continua responsável pela revisão e decisão.

## Evidência e limites

Testes de prompt verificam versão e instruções, ausência de lista fixa e manutenção do teto do schema. Um teste de resposta simulada demonstra que o contrato aceita e conserva referências em vários parágrafos e critério sem evidência. Esses testes não demonstram que o Gemini real seguirá todas as orientações, nem medem revocação, precisão, utilidade pedagógica ou superioridade sobre v3.

Análises v3 já salvas permanecem intactas e com sua versão original. Só uma nova análise concluída pode refletir o v4. Não reexecutar em lote nem fazer novas chamadas reais por este documento. A avaliação acadêmica depende do [protocolo](protocolo-academico-ia.md), corpus autorizado, anotações humanas independentes e autorização específica para o envio ao provedor.

O PR registra os comandos efetivamente executados nesta branch e exige revisão/CI antes da integração na dev. Não altera as telas do Lucas.
