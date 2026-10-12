# Proposta de protocolo acadêmico — IA consultiva do LÉXIS

**Estado:** proposta para aprovação pelos autores e orientadores. Não é um experimento realizado nem uma declaração de qualidade do Gemini. A demonstração de uma chamada real comprova integração, não validade pedagógica.

## Pergunta e unidade de análise

Em redações dissertativo-argumentativas em português, a análise consultiva identifica evidências reais e oferece diagnósticos úteis sobre Legitimação, Pertinência e Uso produtivo, comparados com referências humanas independentes?

A unidade primária é a redação; cada evidência é um intervalo associado a um critério. A análise não atribui nota. Não calcular concordância de notas da IA com notas humanas, pois esse resultado não existe no contrato do sistema.

## Pré-condições antes de qualquer lote real

1. Escolher um corpus cuja utilização, armazenamento e envio ao provedor sejam autorizados para esta finalidade. Registrar origem, condições de uso e responsável pela autorização. A disponibilidade pública, isoladamente, não resolve questões de privacidade.
2. Remover nomes, contatos, identificadores e outros dados pessoais; revisar manualmente os textos desidentificados. Manter arquivos fora do Git e com acesso limitado à equipe autorizada.
3. Definir retenção, exclusão, responsáveis e local de guarda, em acordo com as regras da instituição. Consultar orientação institucional para o tratamento de textos de menores, quando aplicável.
4. Designar pelo menos dois avaliadores com conhecimento de redação, estabelecer a rubrica e realizar treinamento com textos separados da amostra final.
5. Aprovar composição e tamanho da amostra, orçamento máximo, modelos, versões do prompt e número de repetições. O limite técnico de 20 casos por comando não define o tamanho científico da amostra.

Essas decisões não foram fornecidas; por isso, o lote acadêmico real não está autorizado/preparado para execução. A fixture sintética não substitui corpus nem avaliadores.

## Amostragem e referência humana

Selecionar textos por regras fixadas antes de observar resultados: variedade de temas, repertórios explícitos/implícitos, ausência de repertório, diferentes extensões e níveis de desenvolvimento. Documentar inclusões, exclusões, distribuição e limitações; não escolher somente casos que funcionem bem.

Separar um conjunto de calibração do prompt e um conjunto final de avaliação. Textos usados para ajustar o prompt não devem reaparecer como avaliação independente. Se não houver amostra suficiente, declarar estudo exploratório de conveniência, sem generalizações populacionais.

Cada avaliador anota independentemente, sem ver a resposta da IA:

- intervalos literais e critério associado;
- justificativa da legitimidade, pertinência e articulação argumentativa;
- limites aceitáveis para evidências sobrepostas ou múltiplas;
- casos de ausência de evidência, ambiguidade e referência que exija verificação externa.

Preservar as duas anotações originais. Medir concordância antes de discutir divergências e construir uma referência adjudicada, registrando quem decidiu e por quê. Nunca rotular como humana uma anotação produzida pela própria IA.

## Formato e execução reproduzível

O harness existente aceita JSON com `casos[]`, contendo `id`, `tema`, `texto`, `criterios` e `referenciaHumana.evidencias[]`. Cada evidência tem `criterioOrdem`, `trecho`, `inicio` e `fim`. Os offsets seguem índices de string JavaScript (UTF-16), com fim exclusivo; validar `texto.slice(inicio, fim) === trecho`. Não normalizar o texto depois da anotação.

Exportar as referências adjudicadas para esse contrato e registrar, separadamente, as anotações individuais. Guardar versão/hash do conjunto, instruções da rubrica, responsáveis, versão do código, prompt, modelo configurado, parâmetros, data, repetição e limites de custo. Não guardar chaves no relatório.

Com as aprovações documentadas, usar as travas e comandos de [avaliacao-ia.md](avaliacao-ia.md). Cada execução deve ter diretório próprio com `--saida`, pois `latest.json` e `latest.md` são sobrescritos dentro do diretório escolhido. Não executar agora o modo real por este documento.

Exemplo de forma do comando, após aprovação e configuração local:

```powershell
npm.cmd run ai:evaluate -- --modo=real --confirmar-custo --limite=5 --entrada=C:\avaliacao-autorizada\corpus-v1.json --saida=C:\avaliacao-autorizada\execucao-01 --rotulo=prompt-v1-repeticao-01
```

Registrar falhas, respostas inválidas e tentativas repetidas; não apagá-las da amostra. Comparar versões no mesmo conjunto, com as mesmas regras. A versão de modelo configurada deve ser registrada; aliases de provedor podem mudar o comportamento com o tempo.

## Métricas e interpretação

- **Técnicas:** proporção de respostas estruturadas válidas, erros, limites/timeout e latência. Fixture usa latência sintética e não mede serviço externo.
- **Evidências:** precisão, revocação e F1 por correspondência exata de intervalo e critério, seguindo a implementação atual do harness. Apresentar também os denominadores e casos sem referência/previsão. Sobreposição aproximada pode ser uma análise secundária, mas exige implementação e regra previamente definida; não confundir com a métrica já existente.
- **Pedagógicas:** avaliadores analisam correção do diagnóstico, relação com o tema, utilidade da orientação e risco de afirmações sem apoio, em uma escala com exemplos definidos antes do experimento. O harness atual não calcula essas avaliações automaticamente.
- **Concordância humana:** reportar a métrica adequada a cada tipo de anotação, definida com o orientador; reportar divergências e adjudicação. Não usar apenas o consenso final como prova de concordância independente.

Apresentar resultados agregados por redação e critério, dispersão de latência, análise de erros e incerteza compatível com o tamanho da amostra. Se forem usados intervalos por reamostragem, reamostrar por redação, não tratar trechos do mesmo texto como amostras independentes. Não definir um limiar de aprovação depois de observar os resultados.

## Entregáveis para a banca

Protocolo aprovado; documentação de autorização; descrição do corpus sem dados pessoais; rubrica; concordância e adjudicação; registro das execuções; resultados e análise de falhas; limitações. Explicar que o professor revisa e publica a avaliação humana e que a IA pode errar mesmo com resposta estruturalmente válida.

**Ainda dependem da equipe:** corpus autorizado, avaliadores, desenho amostral, orçamento e aprovação metodológica. Nenhuma avaliação humana ou métrica de qualidade real foi fabricada nesta entrega.
