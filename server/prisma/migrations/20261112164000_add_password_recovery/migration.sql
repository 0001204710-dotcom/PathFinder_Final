ALTER TABLE `usuarios`
  ADD COLUMN `codigo_recuperacao_hash` VARCHAR(255) NULL,
  ADD COLUMN `codigo_recuperacao_expira` TIMESTAMP(0) NULL,
  ADD COLUMN `codigo_recuperacao_enviado_em` TIMESTAMP(0) NULL,
  ADD COLUMN `tentativas_recuperacao` INTEGER NOT NULL DEFAULT 0;
