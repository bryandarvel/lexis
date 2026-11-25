-- Expansão compatível: preserva notificações e e-mails de feedback existentes.
-- Eventos novos são exclusivamente internos; emailDestino/statusEmail ficam NULL.
ALTER TABLE `notificacoes`
  MODIFY `feedbackVersaoId` VARCHAR(191) NULL,
  ADD COLUMN `redacaoId` VARCHAR(191) NULL,
  MODIFY `tipo` ENUM('FEEDBACK_PUBLICADO', 'FEEDBACK_CORRIGIDO', 'REDACAO_ENVIADA', 'MATRICULA_ENCERRADA', 'TURMA_ARQUIVADA', 'ALUNO_SAIU_TURMA') NOT NULL,
  MODIFY `emailDestino` VARCHAR(191) NULL,
  MODIFY `statusEmail` ENUM('PENDENTE', 'ENVIANDO', 'ENVIADO', 'ERRO') NULL DEFAULT 'PENDENTE';

CREATE UNIQUE INDEX `notificacoes_usuarioId_redacaoId_tipo_key` ON `notificacoes` (`usuarioId`, `redacaoId`, `tipo`);
CREATE INDEX `notificacoes_redacaoId_idx` ON `notificacoes` (`redacaoId`);
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_redacaoId_fkey`
  FOREIGN KEY (`redacaoId`) REFERENCES `redacoes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
