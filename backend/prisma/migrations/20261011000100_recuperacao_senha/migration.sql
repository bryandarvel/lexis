ALTER TABLE `usuarios` ADD COLUMN `sessaoVersao` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `recuperacoes_senha` (
  `id` VARCHAR(191) NOT NULL,
  `usuarioId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(64) NULL,
  `expiraEm` DATETIME(3) NOT NULL,
  `consumidoEm` DATETIME(3) NULL,
  `statusEmail` ENUM('PENDENTE', 'ENVIANDO', 'ENVIADO', 'ERRO') NOT NULL DEFAULT 'PENDENTE',
  `erroCodigo` VARCHAR(64) NULL,
  `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `enviadoEm` DATETIME(3) NULL,
  UNIQUE INDEX `recuperacoes_senha_tokenHash_key` (`tokenHash`),
  INDEX `recuperacoes_senha_usuarioId_criadoEm_idx` (`usuarioId`, `criadoEm`),
  INDEX `recuperacoes_senha_statusEmail_expiraEm_idx` (`statusEmail`, `expiraEm`),
  PRIMARY KEY (`id`),
  CONSTRAINT `recuperacoes_senha_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
