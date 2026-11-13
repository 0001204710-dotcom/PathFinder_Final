CREATE TABLE `institutional_memberships` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `instituicao_id` INTEGER NOT NULL,
    `medico_id` INTEGER NOT NULL,
    `especialidade` VARCHAR(100) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `data_criacao` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `institutional_memberships_instituicao_id_medico_id_key`(`instituicao_id`, `medico_id`),
    UNIQUE INDEX `institutional_memberships_medico_id_key`(`medico_id`),
    INDEX `institutional_memberships_instituicao_id_idx`(`instituicao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `institutional_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `instituicao_id` INTEGER NOT NULL,
    `medico_id` INTEGER NULL,
    `nome` VARCHAR(100) NOT NULL,
    `data_criacao` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `institutional_groups_instituicao_id_idx`(`instituicao_id`),
    INDEX `institutional_groups_medico_id_idx`(`medico_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dependentes`
    ADD COLUMN `medico_institucional_id` INTEGER NULL,
    ADD COLUMN `grupo_institucional_id` INTEGER NULL,
    ADD INDEX `dependentes_medico_institucional_id_idx`(`medico_institucional_id`),
    ADD INDEX `dependentes_grupo_institucional_id_idx`(`grupo_institucional_id`);

ALTER TABLE `institutional_memberships`
    ADD CONSTRAINT `institutional_memberships_instituicao_id_fkey`
    FOREIGN KEY (`instituicao_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `institutional_memberships_medico_id_fkey`
    FOREIGN KEY (`medico_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `institutional_groups`
    ADD CONSTRAINT `institutional_groups_instituicao_id_fkey`
    FOREIGN KEY (`instituicao_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `institutional_groups_medico_id_fkey`
    FOREIGN KEY (`medico_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `dependentes`
    ADD CONSTRAINT `dependentes_medico_institucional_id_fkey`
    FOREIGN KEY (`medico_institucional_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `dependentes_grupo_institucional_id_fkey`
    FOREIGN KEY (`grupo_institucional_id`) REFERENCES `institutional_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
