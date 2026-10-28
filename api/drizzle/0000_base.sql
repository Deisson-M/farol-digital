-- Farol Digital — tabelas-base usadas pelos novos módulos.
-- ATENÇÃO: se o seu banco já possui usuarios/cursos/matriculas, não aplique
-- esta migration como está; leia a seção "Integração com o projeto existente"
-- do README para ampliar as tabelas atuais em vez de duplicá-las.
CREATE TABLE `usuarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(150) NOT NULL,
	`email` varchar(190) NOT NULL,
	`senha_hash` varchar(255) NOT NULL,
	`papel` enum('estudante','professor','coordenador','admin') NOT NULL DEFAULT 'estudante',
	`ativo` boolean NOT NULL DEFAULT true,
	`criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usuarios_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_usuarios_email` UNIQUE(`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `cursos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`titulo` varchar(200) NOT NULL,
	`descricao` text,
	`nivel` enum('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
	`carga_horaria_minutos` int NOT NULL DEFAULT 0,
	`publicado` boolean NOT NULL DEFAULT false,
	`criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cursos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_cursos_slug` UNIQUE(`slug`),
	CONSTRAINT `ck_cursos_carga_horaria` CHECK (`carga_horaria_minutos` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `matriculas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuario_id` int NOT NULL,
	`curso_id` int NOT NULL,
	`situacao` enum('ativa','concluida','cancelada','trancada') NOT NULL DEFAULT 'ativa',
	`progresso_percentual` tinyint unsigned NOT NULL DEFAULT 0,
	`iniciado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`concluido_em` timestamp NULL,
	`atualizado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matriculas_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_matriculas_usuario_curso` UNIQUE(`usuario_id`,`curso_id`),
	CONSTRAINT `ck_matriculas_progresso` CHECK (`progresso_percentual` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_curso_id_cursos_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `auditoria_eventos` ADD CONSTRAINT `auditoria_eventos_usuario_id_usuarios_id_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_usuarios_papel` ON `usuarios` (`papel`);
--> statement-breakpoint
CREATE INDEX `idx_cursos_publicado` ON `cursos` (`publicado`);
--> statement-breakpoint
CREATE INDEX `idx_matriculas_curso_situacao` ON `matriculas` (`curso_id`,`situacao`);
--> statement-breakpoint
CREATE INDEX `idx_auditoria_acao_data` ON `auditoria_eventos` (`acao`,`criado_em`);
--> statement-breakpoint
CREATE INDEX `idx_auditoria_usuario_data` ON `auditoria_eventos` (`usuario_id`,`criado_em`);
--> statement-breakpoint
CREATE INDEX `idx_auditoria_recurso` ON `auditoria_eventos` (`recurso_tipo`,`recurso_id`);
--> statement-breakpoint
-- Auditoria append-only no nível do banco: impede UPDATE e DELETE silenciosos.
CREATE TRIGGER `trg_auditoria_eventos_sem_update` BEFORE UPDATE ON `auditoria_eventos`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'auditoria_eventos e append-only: UPDATE nao permitido';
--> statement-breakpoint
CREATE TRIGGER `trg_auditoria_eventos_sem_delete` BEFORE DELETE ON `auditoria_eventos`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'auditoria_eventos e append-only: DELETE nao permitido (use a rotina de retencao com usuario dedicado)';
