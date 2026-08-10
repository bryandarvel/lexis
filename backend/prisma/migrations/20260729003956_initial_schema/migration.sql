-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senhaHash` VARCHAR(255) NOT NULL,
    `papel` ENUM('PROFESSOR', 'ALUNO') NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `desativadoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    INDEX `usuarios_papel_ativo_idx`(`papel`, `ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `familiaId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    `revogadoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `refresh_tokens_usuarioId_idx`(`usuarioId`),
    INDEX `refresh_tokens_familiaId_idx`(`familiaId`),
    INDEX `refresh_tokens_expiraEm_idx`(`expiraEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `turmas` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `codigoAcesso` VARCHAR(64) NOT NULL,
    `codigoAtualizadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `professorId` VARCHAR(191) NOT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `arquivadaEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `turmas_codigoAcesso_key`(`codigoAcesso`),
    INDEX `turmas_professorId_ativa_idx`(`professorId`, `ativa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matriculas` (
    `id` VARCHAR(191) NOT NULL,
    `alunoId` VARCHAR(191) NOT NULL,
    `turmaId` VARCHAR(191) NOT NULL,
    `status` ENUM('ATIVA', 'ENCERRADA') NOT NULL DEFAULT 'ATIVA',
    `iniciadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `encerradaEm` DATETIME(3) NULL,

    INDEX `matriculas_alunoId_status_idx`(`alunoId`, `status`),
    INDEX `matriculas_turmaId_status_idx`(`turmaId`, `status`),
    INDEX `matriculas_alunoId_turmaId_idx`(`alunoId`, `turmaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `temas_redacao` (
    `id` VARCHAR(191) NOT NULL,
    `turmaId` VARCHAR(191) NOT NULL,
    `enunciado` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `instrucoes` TEXT NULL,
    `prazoEntrega` DATETIME(3) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `arquivadoEm` DATETIME(3) NULL,
    `criteriosBloqueadosEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `temas_redacao_turmaId_ativo_idx`(`turmaId`, `ativo`),
    INDEX `temas_redacao_prazoEntrega_idx`(`prazoEntrega`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `criterios_avaliacao` (
    `id` VARCHAR(191) NOT NULL,
    `temaId` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `ordem` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `criterios_avaliacao_temaId_nome_key`(`temaId`, `nome`),
    UNIQUE INDEX `criterios_avaliacao_temaId_ordem_key`(`temaId`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `redacoes` (
    `id` VARCHAR(191) NOT NULL,
    `alunoId` VARCHAR(191) NOT NULL,
    `temaId` VARCHAR(191) NOT NULL,
    `texto` LONGTEXT NULL,
    `origemTexto` ENUM('DIGITADO', 'OCR') NOT NULL DEFAULT 'DIGITADO',
    `ocrRevisadoEm` DATETIME(3) NULL,
    `status` ENUM('RASCUNHO', 'ENVIADA', 'AVALIADA') NOT NULL DEFAULT 'RASCUNHO',
    `enviadaEm` DATETIME(3) NULL,
    `prazoConsideradoEm` DATETIME(3) NULL,
    `enviadaComAtraso` BOOLEAN NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `redacoes_temaId_status_idx`(`temaId`, `status`),
    INDEX `redacoes_alunoId_status_idx`(`alunoId`, `status`),
    UNIQUE INDEX `redacoes_alunoId_temaId_key`(`alunoId`, `temaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analises_ia` (
    `id` VARCHAR(191) NOT NULL,
    `redacaoId` VARCHAR(191) NOT NULL,
    `solicitadaPorId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'ERRO') NOT NULL DEFAULT 'PENDENTE',
    `modelo` VARCHAR(100) NOT NULL,
    `versaoPrompt` VARCHAR(50) NOT NULL,
    `criteriosSnapshot` JSON NOT NULL,
    `resultadoEstruturado` JSON NULL,
    `duracaoMs` INTEGER NULL,
    `mensagemErro` TEXT NULL,
    `solicitadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `iniciadaEm` DATETIME(3) NULL,
    `concluidaEm` DATETIME(3) NULL,

    INDEX `analises_ia_redacaoId_solicitadaEm_idx`(`redacaoId`, `solicitadaEm`),
    INDEX `analises_ia_solicitadaPorId_idx`(`solicitadaPorId`),
    INDEX `analises_ia_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedbacks` (
    `id` VARCHAR(191) NOT NULL,
    `redacaoId` VARCHAR(191) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feedbacks_redacaoId_key`(`redacaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback_versoes` (
    `id` VARCHAR(191) NOT NULL,
    `feedbackId` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `professorId` VARCHAR(191) NOT NULL,
    `nota` SMALLINT UNSIGNED NULL,
    `comentarioGeral` TEXT NULL,
    `status` ENUM('RASCUNHO', 'PUBLICADA', 'SUBSTITUIDA') NOT NULL DEFAULT 'RASCUNHO',
    `publicadoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `feedback_versoes_feedbackId_status_idx`(`feedbackId`, `status`),
    INDEX `feedback_versoes_professorId_idx`(`professorId`),
    UNIQUE INDEX `feedback_versoes_feedbackId_numero_key`(`feedbackId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedbacks_criterios` (
    `id` VARCHAR(191) NOT NULL,
    `feedbackVersaoId` VARCHAR(191) NOT NULL,
    `criterioId` VARCHAR(191) NOT NULL,
    `comentario` TEXT NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `feedbacks_criterios_criterioId_idx`(`criterioId`),
    UNIQUE INDEX `feedbacks_criterios_feedbackVersaoId_criterioId_key`(`feedbackVersaoId`, `criterioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificacoes` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `feedbackVersaoId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('FEEDBACK_PUBLICADO', 'FEEDBACK_CORRIGIDO') NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `lidaEm` DATETIME(3) NULL,
    `emailDestino` VARCHAR(191) NOT NULL,
    `statusEmail` ENUM('PENDENTE', 'ENVIANDO', 'ENVIADO', 'ERRO') NOT NULL DEFAULT 'PENDENTE',
    `tentativasEmail` INTEGER NOT NULL DEFAULT 0,
    `emailEnviadoEm` DATETIME(3) NULL,
    `proximaTentativaEm` DATETIME(3) NULL,
    `ultimoErroEmail` TEXT NULL,
    `criadaEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificacoes_usuarioId_lidaEm_idx`(`usuarioId`, `lidaEm`),
    INDEX `notificacoes_statusEmail_proximaTentativaEm_idx`(`statusEmail`, `proximaTentativaEm`),
    INDEX `notificacoes_feedbackVersaoId_idx`(`feedbackVersaoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turmas` ADD CONSTRAINT `turmas_professorId_fkey` FOREIGN KEY (`professorId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `turmas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `temas_redacao` ADD CONSTRAINT `temas_redacao_turmaId_fkey` FOREIGN KEY (`turmaId`) REFERENCES `turmas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `criterios_avaliacao` ADD CONSTRAINT `criterios_avaliacao_temaId_fkey` FOREIGN KEY (`temaId`) REFERENCES `temas_redacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `redacoes` ADD CONSTRAINT `redacoes_alunoId_fkey` FOREIGN KEY (`alunoId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `redacoes` ADD CONSTRAINT `redacoes_temaId_fkey` FOREIGN KEY (`temaId`) REFERENCES `temas_redacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analises_ia` ADD CONSTRAINT `analises_ia_redacaoId_fkey` FOREIGN KEY (`redacaoId`) REFERENCES `redacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analises_ia` ADD CONSTRAINT `analises_ia_solicitadaPorId_fkey` FOREIGN KEY (`solicitadaPorId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_redacaoId_fkey` FOREIGN KEY (`redacaoId`) REFERENCES `redacoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_versoes` ADD CONSTRAINT `feedback_versoes_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `feedbacks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_versoes` ADD CONSTRAINT `feedback_versoes_professorId_fkey` FOREIGN KEY (`professorId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedbacks_criterios` ADD CONSTRAINT `feedbacks_criterios_feedbackVersaoId_fkey` FOREIGN KEY (`feedbackVersaoId`) REFERENCES `feedback_versoes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedbacks_criterios` ADD CONSTRAINT `feedbacks_criterios_criterioId_fkey` FOREIGN KEY (`criterioId`) REFERENCES `criterios_avaliacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_feedbackVersaoId_fkey` FOREIGN KEY (`feedbackVersaoId`) REFERENCES `feedback_versoes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Limita a nota à escala adotada pelo ENEM.
ALTER TABLE `feedback_versoes`
ADD CONSTRAINT `feedback_versoes_nota_intervalo_check`
CHECK (`nota` IS NULL OR `nota` BETWEEN 0 AND 1000);