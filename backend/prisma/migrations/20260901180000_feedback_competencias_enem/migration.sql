-- Mantém a nota total para compatibilidade com feedbacks já publicados
-- e passa a registrar a pontuação humana de cada competência do ENEM.
ALTER TABLE `feedback_versoes`
  ADD COLUMN `competencia1` SMALLINT UNSIGNED NULL,
  ADD COLUMN `competencia2` SMALLINT UNSIGNED NULL,
  ADD COLUMN `competencia3` SMALLINT UNSIGNED NULL,
  ADD COLUMN `competencia4` SMALLINT UNSIGNED NULL,
  ADD COLUMN `competencia5` SMALLINT UNSIGNED NULL;

ALTER TABLE `feedback_versoes`
  ADD CONSTRAINT `feedback_versoes_competencia1_intervalo_check`
    CHECK (`competencia1` IS NULL OR `competencia1` BETWEEN 0 AND 200),
  ADD CONSTRAINT `feedback_versoes_competencia2_intervalo_check`
    CHECK (`competencia2` IS NULL OR `competencia2` BETWEEN 0 AND 200),
  ADD CONSTRAINT `feedback_versoes_competencia3_intervalo_check`
    CHECK (`competencia3` IS NULL OR `competencia3` BETWEEN 0 AND 200),
  ADD CONSTRAINT `feedback_versoes_competencia4_intervalo_check`
    CHECK (`competencia4` IS NULL OR `competencia4` BETWEEN 0 AND 200),
  ADD CONSTRAINT `feedback_versoes_competencia5_intervalo_check`
    CHECK (`competencia5` IS NULL OR `competencia5` BETWEEN 0 AND 200);
