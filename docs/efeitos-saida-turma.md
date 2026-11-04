# Histórico após sair da turma — #55

Decisões do Bryan em 03/11/2026: preservar o desempenho de **todas as turmas**, com rótulo claro na interface, e avisar o professor dentro do sistema na saída voluntária, sem novo e-mail. A parte de regressões descrita aqui não implementa esse novo aviso nem altera telas.

## Comportamento coberto

- Sair encerra a matrícula, não apaga a conta, rascunhos, redações, correções ou notificações. Sem matrícula ativa, a saída responde 404 ACTIVE_ENROLLMENT_NOT_FOUND e não altera matrícula de outra conta.
- Reentrar na mesma turma cria outro registro de matrícula e conserva o encerrado; não é uma duplicata a remover. O rascunho ainda não enviado pode ser retomado quando a matrícula volta a estar ativa. A redação enviada continua imutável.
- O aluno mantém leitura dos próprios textos e feedbacks publicados após sair/trocar de turma. Pode marcar uma notificação própria de feedback como lida. Outra conta não passa a ter acesso. “Lida” não demonstra, por si só, que o feedback foi consultado.
- A turma antiga deixa de permitir salvar/enviar na proposta ao aluno sem vínculo ativo; a leitura do rascunho próprio não concede permissão de escrita. Entrar em outra turma não altera isso.
- Ex-aluno deixa a listagem ativa do professor, mas as entregas enviadas permanecem no histórico do professor responsável; o rascunho privado não é promovido a entrega.
- O desempenho agrega publicações das turmas antigas e atual pelo aluno, sem contar uma correção outra vez por causa de nova matrícula. A interface deve explicar o escopo histórico, não sugerir que os números são exclusivos da turma atual.
- Arquivar a turma encerra matrículas e preserva leitura/histórico. Uma nova saída sem vínculo ativo é recusada, sem apagar a redação.

O [PR #90](https://github.com/bryandarvel/lexis/pull/90) trata separadamente a corrida da saída e o contrato obrigatório com ID da matrícula confirmada. As regressões deste recorte enviam esse ID para manter compatibilidade com a integração futura, mas **não provam a correção da corrida na dev antiga que ainda o ignora**; os testes específicos desse contrato estão no #90.

## Pendências explícitas

O gatilho de aviso ao professor na saída voluntária continua pendente da parte restante da #55 e da integração coordenada do schema/notificações #97, contrato #90 e ordem de locks #91. Os avisos ao aluno por desvinculação/arquivamento são a #64, não foram implementados por estes testes. O rótulo visual do desempenho continua com Lucas.

Não fechar a #55 inteira com base apenas neste recorte de testes. Depois de integrar os avisos, repetir as regressões e conferir FKs/limpeza somente dos IDs fictícios, sem excluir filas globais ou dados de demonstração. A contagem da #54 e seus rótulos de ativos/histórico continuam sendo uma entrega própria.
