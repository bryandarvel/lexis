# Avisos de desvinculação e arquivamento — #64

Backend dependente de #90/#91/#97, com preparação de PRs dependentes aprovada por Bryan. Todos os PRs continuam com destino dev; integrar os pré-requisitos revisados antes deste. Sem mudança de credencial, e-mail, papel ou tela.

## Eventos

| Ação concluída | Destinatário | Tipo |
|---|---|---|
| DELETE /api/turmas/:turmaId/alunos/:alunoId | Aluno cuja matrícula ativa foi encerrada | MATRICULA_ENCERRADA |
| POST /api/turmas/:turmaId/arquivar | Cada aluno distinto com matrícula ativa realmente encerrada | TURMA_ARQUIVADA |

O aviso informa a turma e que redações/correções publicadas permanecem no histórico. Aluno já sem vínculo não recebe aviso de arquivamento. Registros duplicados de matrícula ativa não geram avisos duplicados. Repetir a ação sem nova matrícula ativa não cria evento; uma reentrada seguida de outra desvinculação é um evento novo legítimo. Nada é apagado do histórico.

As respostas de sucesso dessas ações mantêm o envelope anterior. Avisos são criados na **mesma transação** do encerramento; se a persistência da notificação falhar, matrícula/turma não são alteradas. Não há processamento posterior que possa perder o evento entre os dois commits.

A decisão aprovada é **somente dentro do sistema**, sem e-mail. Os novos registros usam emailDestino/statusEmail/feedbackVersaoId/redacaoId nulos; o worker do #97 trabalha apenas com tipos positivos de feedback e não reserva estes eventos. Esta tarefa não dispara worker nem envia mensagens externas.

## Consulta e leitura

GET /api/aluno/notificacoes e PATCH /api/aluno/notificacoes/:id/lida permanecem no contrato existente: propriedade do aviso, papel ALUNO, leitura idempotente e primeira data preservada. No evento novo, feedbackVersao e redacao também são nulos; renderizar título/mensagem como texto, não como HTML. Não interpretar o aviso como publicação de feedback.

Nenhum diagnóstico de IA, texto de redação, e-mail de outro aluno ou dado de outra turma é incluído. O professor recebe a resposta da operação, não uma cópia do aviso do aluno. O aviso ao professor na saída voluntária é a parte separada da #55.

## Concorrência

A FK de notificação também toca a linha do usuário. Entrada/desvinculação usam usuário antes de turma/matrícula; arquivamento obtém os usuários ativos em ordem crescente antes da turma. Não segurar a turma para só depois esperar um usuário que pode estar entrando nela.

Uma prévia fora da transação não é autorização final: depois dos locks, revalidar responsável, turma ativa e lista de alunos. Se entrou um aluno não bloqueado, terminar essa tentativa sem escritas e obter a lista nova. Há no máximo três conferências; crescimento contínuo retorna HTTP409 CLASS_ENROLLMENTS_CHANGED, com mensagem para conferir/confirmar novamente. Nenhum encerramento ou aviso parcial ocorreu nesse conflito. São tentativas locais de consistência, não repetições de provedor nem permissão para o cliente reenviar automaticamente uma ação destrutiva.

Permanecem os erros de autenticação/papel, turma alheia/não encontrada, matrícula ausente e turma arquivada. A autorização é revalidada dentro da operação, não apenas em GET anterior.

## Integração de interface — Lucas

Nenhum arquivo frontend foi alterado por este backend. Na base examinada, AlunoNotificacoesPage exibe título/mensagem, mas seu CTA ainda diz “Ver correção” e obterLinkNotificacao retorna /aluno quando não há feedback. Atualizar o rótulo/ação para avisos de matrícula, sem buscar feedback privado ou inventar redação vinculada. O estado vazio também só menciona correções.

ProfessorTurmaPage ainda contém “O aluno não recebe aviso automático: combine a saída com ele.”; esse texto deixa de ser verdadeiro quando o backend deste PR estiver integrado. Lucas deve ajustá-lo e validar claro/escuro/teclado/responsividade, sem antecipar como implementado antes da integração.

O aceite integrado depende dessa adaptação e dos PRs-base. Testes de API/SQL não são aceite visual. Na futura combinação com reabertura #95, reabrir turma não restaura matrículas e não dispara esses avisos; outro arquivamento com vínculos novos pode produzir novos eventos.
