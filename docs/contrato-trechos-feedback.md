# Trechos aprovados no feedback — #42

Contrato aprovado por Bryan em 03/11/2026. A regra de cor compartilhada é a da #44; o Lote 2 integra a marcação à tela de correção sem alterar este contrato.

## Salvar e publicar

O `PUT /api/redacoes/:redacaoId/feedback` continua recebendo as cinco competências, comentário geral e comentários por critério. Cada item de `criterios` pode receber:

```json
{
  "criterioId": "11111111-1111-4111-8111-111111111111",
  "comentario": "Comentário humano que explica o trecho.",
  "trechos": [
    {
      "inicio": 3,
      "fim": 17,
      "trecho": "trecho literal",
      "analiseIaId": "22222222-2222-4222-8222-222222222222"
    }
  ]
}
```

IDs e texto acima são apenas formato fictício, não uma solicitação executável: os offsets devem corresponder à redação real do recurso. `analiseIaId` é opcional, UUID quando enviado. Não enviar IDs de registros de trecho, `sugeridoPorIa`, diagnósticos ou outros campos de resposta; a entrada é estrita.

- Até 20 trechos por comentário, sem mínimo obrigatório. O comentário continua obrigatório para cada critério incluído; não existe nota/peso por trecho ou critério.
- `inicio` e `fim` são inteiros UTF-16 de string JavaScript, início zero e fim exclusivo; `0 <= inicio < fim <= texto.length`. Não aparar nem normalizar o texto selecionado. Deve valer `texto.slice(inicio, fim) === trecho`; não cortar um par surrogate no meio.
- Duplicata do mesmo intervalo no mesmo critério é recusada. Sobreposições e o mesmo intervalo em critérios diferentes são permitidos. Retorno ordenado por início/fim, não pela ordem de envio.
- Omitir `trechos` preserva os trechos daquele critério no rascunho atual. Se não houver rascunho, herda os da versão publicada atual ao criar a próxima versão. Sem versão anterior, usa lista vazia. Não reaparecem marcações removidas de um rascunho existente.
- Enviar `trechos: []` remove as marcações daquele critério no rascunho. Remover o próprio comentário da lista `criterios` também remove seus trechos no rascunho, sem alterar publicações anteriores. A lista de comentários mantém a semântica de substituição já existente.

## Origem derivada no servidor

Uma referência a análise inexistente, não concluída ou de outra redação recebe 422 `FEEDBACK_ANALYSIS_INVALID`, sem revelar sua existência em outra conta. A redação é primeiro autorizada para o professor responsável.

Para uma análise concluída desta redação, o servidor confere o critério pelo ID/nome/ordem no snapshot e por nome/ordem no resultado. Só atribui origem IA se uma evidência `LOCALIZADA` coincidir exatamente em `(inicio, fim, trecho)`. Sem coincidência — inclusive após mover as bordas — a marcação é humana (`sugeridoPorIa: false`, `analiseIaId: null`). Não existe origem parcial nem booleano de origem aceito do cliente. Marcação sem `analiseIaId` é humana.

Essa origem significa apenas correspondência com uma sugestão mantida pelo professor; não prova que o conteúdo do repertório é verdadeiro, nem que o comentário foi gerado pela IA.

## Respostas, histórico e compatibilidade

Salvar/consultar pelo professor inclui, em cada comentário, `trechos[{id,inicio,fim,trecho,sugeridoPorIa,analiseIaId}]`. A referência persistida usa FK para a análise quando a origem foi confirmada. Não há cópia do JSON privado em feedbacks.

O `POST /api/redacoes/:redacaoId/feedback/publicar` mantém a publicação humana e sua transação: revalida os intervalos, publica o rascunho, substitui a publicação anterior e cria o aviso de feedback já existente. Salvar não publica. Nota pertence às cinco competências humanas.

### Republicação sem alterações (UX-040)

Antes de publicar, a API compara o rascunho válido com a última versão publicada da mesma correção, dentro da transação que bloqueia a redação. O conteúdo é igual quando as cinco notas, o comentário geral, os critérios por ID, seus comentários e os trechos por `(inicio, fim, trecho)` coincidem. A ordem das listas não importa. A comparação ignora IDs internos de registros, número da versão, datas, nota total derivada e metadados de origem por IA (`sugeridoPorIa` e `analiseIaId`). O texto persistido é comparado literalmente, sem normalização adicional.

Se o conteúdo for igual, o POST retorna 409 `FEEDBACK_UNCHANGED`. O rascunho permanece editável, a versão publicada e o histórico ficam intactos, e nenhum aviso ou item na fila de e-mail é criado. O PUT de rascunho continua inalterado; se não houver rascunho, o POST continua retornando 409 `FEEDBACK_DRAFT_REQUIRED`.

### Leitura e compatibilidade

O `GET /api/aluno/redacoes/:redacaoId/feedback` retorna **somente a versão publicada atual e do próprio aluno**, com `trechos[{id,inicio,fim,trecho,sugeridoPorIa}]`. Não retorna `analiseIaId`, snapshot, diagnóstico, resultado bruto ou orientação privada. Rascunhos permanecem privados, e versões substituídas conservam seus registros para o histórico do professor.

Clientes antigos podem continuar enviando comentários sem `trechos` e ignorando o novo campo de resposta. Na interface do Lote 2, a redação e os comentários usam a mesma numeração, por início e com o intervalo mais longo primeiro no empate. O aluno só vê os trechos aprovados da publicação atual, sem um rótulo que indique a origem por IA. Sugestões descartadas pelo professor não são persistidas.

Erros adicionais: 422 `FEEDBACK_EVIDENCE_INVALID` para divergência literal/limites inválidos de texto; 422 de validação para campos extras, intervalos repetidos, formato, limites ou UUID inválido. Permanecem autenticação, papel, posse, critérios do tema e os códigos existentes de feedback indisponível/incompleto.

## Integração e operação

Migration aditiva `20261103233000_trechos_feedback_publicado`: nova tabela filha de `FeedbackCriterio`, exclusão em cascata apenas do comentário ao qual pertence, FK de análise Restrict. Nenhum dado existente é convertido em marcação automática.

O cliente envia só os campos aceitos e mantém a decisão humana explícita. Os rascunhos locais da correção armazenam apenas os intervalos e a referência opcional à análise, no escopo da conta e da redação. O conteúdo literal é reconstruído a partir da redação enviada quando o professor salva. A tela de feedback não consulta o endpoint privado de IA.

Na integração com #94, preservar a distinção entre redação própria sem feedback e recurso indisponível: os dois PRs tocam `feedbacks.repository.js`. Repetir migrations e testes na base conjunta antes do aceite. Não aplicar migrations em produção por este documento.
