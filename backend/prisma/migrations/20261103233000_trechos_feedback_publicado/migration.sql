CREATE TABLE `feedbacks_criterios_trechos` (
    `id` VARCHAR(191) NOT NULL,
    `feedbackCriterioId` VARCHAR(191) NOT NULL,
    `inicio` INTEGER NOT NULL,
    `fim` INTEGER NOT NULL,
    `trecho` TEXT NOT NULL,
    `sugeridoPorIa` BOOLEAN NOT NULL DEFAULT false,
    `analiseIaId` VARCHAR(191) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `feedbacks_criterios_trechos_feedbackCriterioId_inicio_fim_key` (`feedbackCriterioId`, `inicio`, `fim`),
    INDEX `feedbacks_criterios_trechos_analiseIaId_idx` (`analiseIaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `feedbacks_criterios_trechos` ADD CONSTRAINT `feedbacks_criterios_trechos_feedbackCriterioId_fkey` FOREIGN KEY (`feedbackCriterioId`) REFERENCES `feedbacks_criterios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `feedbacks_criterios_trechos` ADD CONSTRAINT `feedbacks_criterios_trechos_analiseIaId_fkey` FOREIGN KEY (`analiseIaId`) REFERENCES `analises_ia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
