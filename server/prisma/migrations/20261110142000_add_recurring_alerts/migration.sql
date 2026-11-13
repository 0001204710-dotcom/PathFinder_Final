CREATE TABLE `alertas_recorrentes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dependente_id` INTEGER NOT NULL,
    `tipo` VARCHAR(100) NOT NULL,
    `titulo` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `prioridade` VARCHAR(20) NOT NULL,
    `dias_semana` VARCHAR(20) NOT NULL,
    `data_inicio` DATE NOT NULL,
    `horario` VARCHAR(5) NOT NULL,
    `proximo_disparo` TIMESTAMP(0) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `alertas_recorrentes_dependente_id_idx`(`dependente_id`),
    INDEX `alertas_recorrentes_ativo_proximo_disparo_idx`(`ativo`, `proximo_disparo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `alertas_recorrentes`
    ADD CONSTRAINT `alertas_recorrentes_dependente_id_fkey`
    FOREIGN KEY (`dependente_id`) REFERENCES `dependentes`(`id`)
    ON DELETE CASCADE ON UPDATE NO ACTION;
