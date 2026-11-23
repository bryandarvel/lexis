CREATE TABLE `alteracoes_email` (
    `usuarioId` VARCHAR(191) NOT NULL,
    `novoEmail` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `sessaoVersao` INTEGER NOT NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    UNIQUE INDEX `alteracoes_email_tokenHash_key` (`tokenHash`),
    INDEX `alteracoes_email_expiraEm_idx` (`expiraEm`),
    PRIMARY KEY (`usuarioId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `alteracoes_email` ADD CONSTRAINT `alteracoes_email_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
