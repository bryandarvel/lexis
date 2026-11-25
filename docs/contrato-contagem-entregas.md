# Contagem de alunos e histórico — backend da #54

Esta entrega prepara a API. A correção visual da proposta continua pendente com Lucas, em coordenação com seu PR #68. Não considerar a #54 totalmente resolvida antes dessa integração.

## Resposta aditiva

`GET /api/turmas/:turmaId/redacoes?temaId=:temaId` mantém `data.redacoes`, sem excluir redações de ex-alunos, e acrescenta:

```json
{
  "data": {
    "resumoEntregas": {
      "totalAlunosAtivos": 5,
      "alunosAtivosQueEntregaram": 5,
      "alunosSemMatriculaAtivaQueEntregaram": 1
    }
  }
}
```

O exemplo mostra apenas o novo campo; a resposta também contém `data.redacoes`. O cenário dos contadores corresponde a seis redações na lista real. Cada item de `redacoes` preserva seus campos e acrescenta `aluno.matriculaAtivaNaTurma` (booleano). Nenhuma matrícula ou ID de turma alheia é exposto.

As contagens são de **alunos distintos**, não de registros de matrícula nem de quantidade de redações. Consideram os mesmos filtros `temaId` e `status` aplicados à lista. Sem filtro de tema, um aluno que entregou em várias propostas continua contado uma vez. Com `status=AVALIADA`, o resumo considera somente as redações avaliadas retornadas por esse filtro.

“Ativo” aqui significa matrícula ATIVA nesta turma ativa, preservando a regra atual de vínculo; não significa situação da conta do usuário. Matrículas encerradas preservam o histórico. Uma reentrada torna o aluno atual novamente, sem duplicá-lo por matrículas anteriores. Duplicação legada de matrícula ativa também não aumenta os contadores.

A lista e o conjunto de alunos ativos são consultados em uma transação de leitura RepeatableRead, para usar a mesma fotografia do banco. O numerador é a interseção dos alunos com entrega e dos alunos ativos; não se limita artificialmente um percentual a 100% nem se apagam entregas históricas para esconder incoerências.

Em turma arquivada, o total ativo é zero e todas as entregas retornadas são históricas. Rascunhos permanecem privados. Isolamento e erros 401/403/404/422 existentes são preservados.

As respostas públicas de turma também passam a contar alunos distintos com matrícula ativa em `quantidadeAlunosAtivos`. A lista interna de matrículas usada na contagem não é retornada.

## Integração da página da proposta

O serviço atual `listarRedacoesDaTurma` descarta metadados e devolve apenas o array. Adicionar uma forma de consumir `data.resumoEntregas` sem quebrar os demais consumidores desse serviço. `carregarPropostaProfessor` deve preservar a lista histórica e usar o novo resumo para os indicadores.

Nas duas ocorrências de “X de Y alunos entregaram”, usar `alunosAtivosQueEntregaram` e `totalAlunosAtivos` **do mesmo resumo**, não o denominador de uma requisição separada a `GET /turmas/:id`. Mostrar os alunos históricos à parte e identificá-los na lista por `matriculaAtivaNaTurma: false`.

Para denominador zero, não dividir por zero: indicar ausência de alunos ativos e apresentar o histórico separadamente. Se o resumo estiver indisponível durante a integração, indicar essa indisponibilidade; não inventar números nem contar todo o histórico como ativo.

Sem migration, nova biblioteca, alteração de redações ou chamada a serviços externos. A interface do Lucas não foi modificada por este backend.
