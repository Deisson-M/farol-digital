-- Etapa 1 — Trilhas de aprendizagem
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
	`criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trilhas_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_trilhas_slug` UNIQUE(`slug`),
	CONSTRAINT `ck_trilhas_percentual_minimo` CHECK (`percentual_minimo` BETWEEN 1 AND 100),
	CONSTRAINT `ck_trilhas_objetivos_array` CHECK (JSON_TYPE(`objetivos`) = 'ARRAY')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
	CONSTRAINT `uq_trilha_cursos_trilha_ordem` UNIQUE(`trilha_id`,`ordem`),
	CONSTRAINT `ck_trilha_cursos_ordem` CHECK (`ordem` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `progresso_trilhas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`trilha_id` int NOT NULL,
	`situacao` enum('nao_iniciada','em_andamento','concluida') NOT NULL DEFAULT 'nao_iniciada',
	`percentual` tinyint unsigned NOT NULL DEFAULT 0,
	`cursos_concluidos` smallint unsigned NOT NULL DEFAULT 0,
	`cursos_considerados` smallint unsigned NOT NULL DEFAULT 0,
	`iniciada_em` timestamp NULL,
	`concluida_em` timestamp NULL,
	`atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `progresso_trilhas_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_progresso_trilhas_usuario_trilha` UNIQUE(`usuario_id`,`trilha_id`),
	CONSTRAINT `ck_progresso_trilhas_percentual` CHECK (`percentual` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `trilhas` ADD CONSTRAINT `trilhas_criado_por_usuarios_id_fk` FOREIGN KEY (`criado_por`) REFERENCES `usuarios`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `trilha_cursos` ADD CONSTRAINT `trilha_cursos_trilha_id_trilhas_id_fk` FOREIGN KEY (`trilha_id`) REFERENCES `trilhas`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `trilha_cursos` ADD CONSTRAINT `trilha_cursos_curso_id_cursos_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `progresso_trilhas` ADD CONSTRAINT `progresso_trilhas_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `progresso_trilhas` ADD CONSTRAINT `progresso_trilhas_trilha_id_trilhas_id_fk` FOREIGN KEY (`trilha_id`) REFERENCES `trilhas`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_trilhas_publicada_nivel` ON `trilhas` (`publicada`,`nivel`);
--> statement-breakpoint
CREATE INDEX `idx_trilhas_tema` ON `trilhas` (`tema`);
--> statement-breakpoint
CREATE INDEX `idx_trilha_cursos_curso` ON `trilha_cursos` (`curso_id`);
--> statement-breakpoint
CREATE INDEX `idx_progresso_trilhas_trilha_situacao` ON `progresso_trilhas` (`trilha_id`,`situacao`);
