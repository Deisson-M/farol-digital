CREATE TABLE `auditoria_eventos` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`evento_id` char(36) NOT NULL,
	`usuario_id` int,
	`acao` varchar(80) NOT NULL,
	`recurso_tipo` varchar(60) NOT NULL,
	`recurso_id` varchar(64),
	`resultado` enum('sucesso','falha','negado') NOT NULL,
	`correlacao_id` varchar(64),
	`justificativa` varchar(500),
	`detalhes` json,
	`criado_em` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `auditoria_eventos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_auditoria_evento_id` UNIQUE(`evento_id`)
);
--> statement-breakpoint
CREATE TABLE `cursos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`titulo` varchar(200) NOT NULL,
	`descricao` text,
	`nivel` enum('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
	`carga_horaria_minutos` int NOT NULL DEFAULT 0,
	`preco_centavos` int unsigned NOT NULL DEFAULT 0,
	`destaque` boolean NOT NULL DEFAULT false,
	`publicado` boolean NOT NULL DEFAULT false,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cursos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_cursos_slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `matriculas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`curso_id` int NOT NULL,
	`situacao` enum('ativa','concluida','cancelada','trancada') NOT NULL DEFAULT 'ativa',
	`progresso_percentual` tinyint unsigned NOT NULL DEFAULT 0,
	`iniciado_em` timestamp NOT NULL DEFAULT (now()),
	`concluido_em` timestamp,
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matriculas_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_matriculas_usuario_curso` UNIQUE(`usuario_id`,`curso_id`)
);
--> statement-breakpoint
CREATE TABLE `redefinicoes_senha` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`token_hash` char(64) NOT NULL,
	`expira_em` timestamp NOT NULL,
	`usado_em` timestamp,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `redefinicoes_senha_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_redefinicoes_senha_token` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(150) NOT NULL,
	`email` varchar(190) NOT NULL,
	`senha_hash` varchar(255) NOT NULL,
	`papel` enum('estudante','professor','coordenador','admin') NOT NULL DEFAULT 'estudante',
	`ativo` boolean NOT NULL DEFAULT true,
	`telefone` varchar(20),
	`area_atuacao` varchar(120),
	`situacao_docente` enum('nao_se_aplica','pendente','aprovado','recusado') NOT NULL DEFAULT 'nao_se_aplica',
	`termos_versao` varchar(20),
	`termos_aceitos_em` timestamp,
	`sessao_versao` int NOT NULL DEFAULT 1,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usuarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_usuarios_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `progresso_trilhas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`trilha_id` int NOT NULL,
	`situacao` enum('nao_iniciada','em_andamento','concluida') NOT NULL DEFAULT 'nao_iniciada',
	`percentual` tinyint unsigned NOT NULL DEFAULT 0,
	`cursos_concluidos` smallint unsigned NOT NULL DEFAULT 0,
	`cursos_considerados` smallint unsigned NOT NULL DEFAULT 0,
	`iniciada_em` timestamp,
	`concluida_em` timestamp,
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `progresso_trilhas_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_progresso_trilhas_usuario_trilha` UNIQUE(`usuario_id`,`trilha_id`)
);
--> statement-breakpoint
CREATE TABLE `trilha_cursos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trilha_id` int NOT NULL,
	`curso_id` int NOT NULL,
	`ordem` smallint unsigned NOT NULL,
	`obrigatorio` boolean NOT NULL DEFAULT true,
	`requer_anteriores` boolean NOT NULL DEFAULT true,
	CONSTRAINT `trilha_cursos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_trilha_cursos_trilha_curso` UNIQUE(`trilha_id`,`curso_id`),
	CONSTRAINT `uq_trilha_cursos_trilha_ordem` UNIQUE(`trilha_id`,`ordem`)
);
--> statement-breakpoint
CREATE TABLE `trilhas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`titulo` varchar(160) NOT NULL,
	`descricao` text NOT NULL,
	`tema` varchar(80) NOT NULL,
	`nivel` enum('iniciante','intermediario','avancado') NOT NULL,
	`objetivos` json NOT NULL,
	`criterio_conclusao` enum('todos_obrigatorios','percentual_minimo') NOT NULL DEFAULT 'todos_obrigatorios',
	`percentual_minimo` tinyint unsigned NOT NULL DEFAULT 100,
	`publicada` boolean NOT NULL DEFAULT false,
	`criado_por` int,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trilhas_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_trilhas_slug` UNIQUE(`slug`)
);
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
	`expira_em` timestamp,
	`motivo_recusa` varchar(200),
	`confirmado_em` timestamp,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pagamentos_codigo` UNIQUE(`codigo`),
	CONSTRAINT `uq_pagamentos_idempotencia` UNIQUE(`pedido_id`,`chave_idempotencia`),
	CONSTRAINT `uq_pagamentos_provedor_ref` UNIQUE(`provedor`,`referencia_provedor`)
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` char(36) NOT NULL,
	`usuario_id` int NOT NULL,
	`curso_id` int NOT NULL,
	`valor_centavos` int unsigned NOT NULL,
	`situacao` enum('aguardando_pagamento','pago','cancelado','expirado') NOT NULL DEFAULT 'aguardando_pagamento',
	`pago_em` timestamp,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pedidos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_pedidos_codigo` UNIQUE(`codigo`)
);
--> statement-breakpoint
ALTER TABLE `auditoria_eventos` ADD CONSTRAINT `auditoria_eventos_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_curso_id_cursos_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `redefinicoes_senha` ADD CONSTRAINT `redefinicoes_senha_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progresso_trilhas` ADD CONSTRAINT `progresso_trilhas_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progresso_trilhas` ADD CONSTRAINT `progresso_trilhas_trilha_id_trilhas_id_fk` FOREIGN KEY (`trilha_id`) REFERENCES `trilhas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trilha_cursos` ADD CONSTRAINT `trilha_cursos_trilha_id_trilhas_id_fk` FOREIGN KEY (`trilha_id`) REFERENCES `trilhas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trilha_cursos` ADD CONSTRAINT `trilha_cursos_curso_id_cursos_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trilhas` ADD CONSTRAINT `trilhas_criado_por_usuarios_id_fk` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_pedido_id_pedidos_id_fk` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_curso_id_cursos_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_auditoria_acao_data` ON `auditoria_eventos` (`acao`,`criado_em`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_usuario_data` ON `auditoria_eventos` (`usuario_id`,`criado_em`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_recurso` ON `auditoria_eventos` (`recurso_tipo`,`recurso_id`);--> statement-breakpoint
CREATE INDEX `idx_cursos_publicado` ON `cursos` (`publicado`);--> statement-breakpoint
CREATE INDEX `idx_cursos_destaque` ON `cursos` (`destaque`);--> statement-breakpoint
CREATE INDEX `idx_matriculas_curso_situacao` ON `matriculas` (`curso_id`,`situacao`);--> statement-breakpoint
CREATE INDEX `idx_redefinicoes_senha_usuario` ON `redefinicoes_senha` (`usuario_id`,`criado_em`);--> statement-breakpoint
CREATE INDEX `idx_usuarios_papel` ON `usuarios` (`papel`);--> statement-breakpoint
CREATE INDEX `idx_usuarios_situacao_docente` ON `usuarios` (`situacao_docente`);--> statement-breakpoint
CREATE INDEX `idx_progresso_trilhas_trilha_situacao` ON `progresso_trilhas` (`trilha_id`,`situacao`);--> statement-breakpoint
CREATE INDEX `idx_trilha_cursos_curso` ON `trilha_cursos` (`curso_id`);--> statement-breakpoint
CREATE INDEX `idx_trilhas_publicada_nivel` ON `trilhas` (`publicada`,`nivel`);--> statement-breakpoint
CREATE INDEX `idx_trilhas_tema` ON `trilhas` (`tema`);--> statement-breakpoint
CREATE INDEX `idx_pagamentos_pedido_situacao` ON `pagamentos` (`pedido_id`,`situacao`);--> statement-breakpoint
CREATE INDEX `idx_pedidos_usuario_curso` ON `pedidos` (`usuario_id`,`curso_id`,`situacao`);