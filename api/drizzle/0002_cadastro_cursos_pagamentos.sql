-- Etapa 1.1 — cadastro (aluno/docente), redefinição de senha, cursos pagos e pagamentos
ALTER TABLE `usuarios`
	ADD `telefone` varchar(20),
	ADD `area_atuacao` varchar(120),
	ADD `situacao_docente` enum('nao_se_aplica','pendente','aprovado','recusado') NOT NULL DEFAULT 'nao_se_aplica',
	ADD `termos_versao` varchar(20),
	ADD `termos_aceitos_em` timestamp NULL,
	ADD `sessao_versao` int NOT NULL DEFAULT 1;
--> statement-breakpoint
-- Professores já existentes continuam com acesso de professor.
UPDATE `usuarios` SET `situacao_docente` = 'aprovado' WHERE `papel` = 'professor';
--> statement-breakpoint
CREATE INDEX `idx_usuarios_situacao_docente` ON `usuarios` (`situacao_docente`);
--> statement-breakpoint
ALTER TABLE `cursos`
	ADD `preco_centavos` int unsigned NOT NULL DEFAULT 0,
	ADD `destaque` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE INDEX `idx_cursos_destaque` ON `cursos` (`destaque`);
--> statement-breakpoint
CREATE TABLE `redefinicoes_senha` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expira_em` timestamp NOT NULL,
	`usado_em` timestamp NULL,
	`criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `redefinicoes_senha_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_redefinicoes_senha_token` UNIQUE(`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `redefinicoes_senha` ADD CONSTRAINT `redefinicoes_senha_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_redefinicoes_senha_usuario` ON `redefinicoes_senha` (`usuario_id`,`criado_em`);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` char(36) NOT NULL,
	`usuario_id` int NOT NULL,
	`curso_id` int NOT NULL,
	`valor_centavos` int unsigned NOT NULL,
	`situacao` enum('aguardando_pagamento','pago','cancelado','expirado') NOT NULL DEFAULT 'aguardando_pagamento',
	`pago_em` timestamp NULL,
	`criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pedidos_codigo` UNIQUE(`codigo`),
	CONSTRAINT `ck_pedidos_valor` CHECK (`valor_centavos` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_curso_id_cursos_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_pedidos_usuario_curso` ON `pedidos` (`usuario_id`,`curso_id`,`situacao`);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` char(36) NOT NULL,
	`pedido_id` int NOT NULL,
	`metodo` enum('cartao_credito','cartao_debito','pix','boleto','paypal','carteira_digital') NOT NULL,
	`situacao` enum('pendente','aprovado','recusado','expirado','cancelado') NOT NULL DEFAULT 'pendente',
	`valor_centavos` int unsigned NOT NULL,
	`parcelas` tinyint unsigned NOT NULL DEFAULT 1,
	`chave_idempotencia` varchar(80) NOT NULL,
	`provedor` varchar(40) NOT NULL,
	`referencia_provedor` varchar(120),
	`cartao_bandeira` varchar(20),
	`cartao_final` char(4),
	`pagador_documento_mascarado` varchar(20),
	`pix_copia_cola` text,
	`boleto_linha_digitavel` varchar(60),
	`boleto_vencimento` date,
	`url_aprovacao` varchar(500),
	`expira_em` timestamp NULL,
	`motivo_recusa` varchar(200),
	`confirmado_em` timestamp NULL,
	`criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pagamentos_codigo` UNIQUE(`codigo`),
	CONSTRAINT `uq_pagamentos_idempotencia` UNIQUE(`pedido_id`,`chave_idempotencia`),
	CONSTRAINT `uq_pagamentos_provedor_ref` UNIQUE(`provedor`,`referencia_provedor`),
	CONSTRAINT `ck_pagamentos_parcelas` CHECK (`parcelas` BETWEEN 1 AND 12),
	CONSTRAINT `ck_pagamentos_valor` CHECK (`valor_centavos` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_pedido_id_pedidos_id_fk` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_pagamentos_pedido_situacao` ON `pagamentos` (`pedido_id`,`situacao`);
