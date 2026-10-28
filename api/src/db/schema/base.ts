/**
 * Tabelas-base do Farol Digital usadas pelos novos módulos.
 *
 * Se o seu projeto já possui estas tabelas, NÃO aplique a parte "base" da
 * migration 0000: compare as colunas abaixo com o modelo existente e amplie-o
 * (veja README, seção "Integração com o projeto existente").
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { NIVEIS, PAPEIS, RESULTADOS_AUDITORIA, SITUACOES_DOCENTE, SITUACOES_MATRICULA } from './enums.js';

export * from './enums.js';

export const usuarios = mysqlTable(
  'usuarios',
  {
    id: int('id').autoincrement().primaryKey(),
    nome: varchar('nome', { length: 150 }).notNull(),
    email: varchar('email', { length: 190 }).notNull(),
    senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
    papel: mysqlEnum('papel', PAPEIS).notNull().default('estudante'),
    ativo: boolean('ativo').notNull().default(true),
    telefone: varchar('telefone', { length: 20 }),
    /** Área de atuação/formação informada no cadastro de docente. */
    areaAtuacao: varchar('area_atuacao', { length: 120 }),
    situacaoDocente: mysqlEnum('situacao_docente', SITUACOES_DOCENTE).notNull().default('nao_se_aplica'),
    termosVersao: varchar('termos_versao', { length: 20 }),
    termosAceitosEm: timestamp('termos_aceitos_em'),
    /** Incrementada ao trocar a senha: invalida tokens emitidos antes. */
    sessaoVersao: int('sessao_versao').notNull().default(1),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex('uq_usuarios_email').on(t.email),
    index('idx_usuarios_papel').on(t.papel),
    index('idx_usuarios_situacao_docente').on(t.situacaoDocente),
  ],
);

export const cursos = mysqlTable(
  'cursos',
  {
    id: int('id').autoincrement().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    titulo: varchar('titulo', { length: 200 }).notNull(),
    descricao: text('descricao'),
    nivel: mysqlEnum('nivel', NIVEIS).notNull().default('iniciante'),
    cargaHorariaMinutos: int('carga_horaria_minutos').notNull().default(0),
    /** Preço em centavos; 0 = curso gratuito. */
    precoCentavos: int('preco_centavos', { unsigned: true }).notNull().default(0),
    destaque: boolean('destaque').notNull().default(false),
    publicado: boolean('publicado').notNull().default(false),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex('uq_cursos_slug').on(t.slug),
    index('idx_cursos_publicado').on(t.publicado),
    index('idx_cursos_destaque').on(t.destaque),
  ],
);

export const matriculas = mysqlTable(
  'matriculas',
  {
    id: int('id').autoincrement().primaryKey(),
    usuarioId: int('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    cursoId: int('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'restrict' }),
    situacao: mysqlEnum('situacao', SITUACOES_MATRICULA).notNull().default('ativa'),
    progressoPercentual: tinyint('progresso_percentual', { unsigned: true }).notNull().default(0),
    iniciadoEm: timestamp('iniciado_em').notNull().defaultNow(),
    concluidoEm: timestamp('concluido_em'),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex('uq_matriculas_usuario_curso').on(t.usuarioId, t.cursoId),
    index('idx_matriculas_curso_situacao').on(t.cursoId, t.situacao),
  ],
);

/**
 * Registro de auditoria append-only. A aplicação só faz INSERT nesta tabela;
 * a etapa 7 (Auditoria e segurança) amplia consultas, filtros e retenção.
 */
export const auditoriaEventos = mysqlTable(
  'auditoria_eventos',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    eventoId: char('evento_id', { length: 36 }).notNull(),
    usuarioId: int('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    acao: varchar('acao', { length: 80 }).notNull(),
    recursoTipo: varchar('recurso_tipo', { length: 60 }).notNull(),
    recursoId: varchar('recurso_id', { length: 64 }),
    resultado: mysqlEnum('resultado', RESULTADOS_AUDITORIA).notNull(),
    correlacaoId: varchar('correlacao_id', { length: 64 }),
    justificativa: varchar('justificativa', { length: 500 }),
    detalhes: json('detalhes').$type<Record<string, unknown>>(),
    criadoEm: timestamp('criado_em', { fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => [
    uniqueIndex('uq_auditoria_evento_id').on(t.eventoId),
    index('idx_auditoria_acao_data').on(t.acao, t.criadoEm),
    index('idx_auditoria_usuario_data').on(t.usuarioId, t.criadoEm),
    index('idx_auditoria_recurso').on(t.recursoTipo, t.recursoId),
  ],
);

/** Pedidos de redefinição de senha. Guarda apenas o hash SHA-256 do token. */
export const redefinicoesSenha = mysqlTable(
  'redefinicoes_senha',
  {
    id: int('id').autoincrement().primaryKey(),
    usuarioId: int('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiraEm: timestamp('expira_em').notNull(),
    usadoEm: timestamp('usado_em'),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_redefinicoes_senha_token').on(t.tokenHash),
    index('idx_redefinicoes_senha_usuario').on(t.usuarioId, t.criadoEm),
  ],
);
