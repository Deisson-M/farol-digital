import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { cursos, usuarios } from './base.js';
import { CRITERIOS_CONCLUSAO, NIVEIS, SITUACOES_TRILHA } from './enums.js';

export const trilhas = mysqlTable(
  'trilhas',
  {
    id: int('id').autoincrement().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    titulo: varchar('titulo', { length: 160 }).notNull(),
    descricao: text('descricao').notNull(),
    tema: varchar('tema', { length: 80 }).notNull(),
    nivel: mysqlEnum('nivel', NIVEIS).notNull(),
    /** Lista de objetivos de aprendizagem (strings). */
    objetivos: json('objetivos').$type<string[]>().notNull(),
    criterioConclusao: mysqlEnum('criterio_conclusao', CRITERIOS_CONCLUSAO)
      .notNull()
      .default('todos_obrigatorios'),
    /** Usado apenas quando criterio_conclusao = 'percentual_minimo'. */
    percentualMinimo: tinyint('percentual_minimo', { unsigned: true }).notNull().default(100),
    publicada: boolean('publicada').notNull().default(false),
    criadoPor: int('criado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex('uq_trilhas_slug').on(t.slug),
    index('idx_trilhas_publicada_nivel').on(t.publicada, t.nivel),
    index('idx_trilhas_tema').on(t.tema),
  ],
);

/** Sequência de cursos de uma trilha. */
export const trilhaCursos = mysqlTable(
  'trilha_cursos',
  {
    id: int('id').autoincrement().primaryKey(),
    trilhaId: int('trilha_id')
      .notNull()
      .references(() => trilhas.id, { onDelete: 'cascade' }),
    cursoId: int('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'restrict' }),
    ordem: smallint('ordem', { unsigned: true }).notNull(),
    /** Cursos obrigatórios contam para o progresso e para a conclusão. */
    obrigatorio: boolean('obrigatorio').notNull().default(true),
    /** Se verdadeiro, o curso só é liberado após concluir os obrigatórios anteriores. */
    requerAnteriores: boolean('requer_anteriores').notNull().default(true),
  },
  (t) => [
    uniqueIndex('uq_trilha_cursos_trilha_curso').on(t.trilhaId, t.cursoId),
    uniqueIndex('uq_trilha_cursos_trilha_ordem').on(t.trilhaId, t.ordem),
    index('idx_trilha_cursos_curso').on(t.cursoId),
  ],
);

/** Fotografia persistida do progresso, recalculada a partir das matrículas. */
export const progressoTrilhas = mysqlTable(
  'progresso_trilhas',
  {
    id: int('id').autoincrement().primaryKey(),
    usuarioId: int('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    trilhaId: int('trilha_id')
      .notNull()
      .references(() => trilhas.id, { onDelete: 'cascade' }),
    situacao: mysqlEnum('situacao', SITUACOES_TRILHA).notNull().default('nao_iniciada'),
    percentual: tinyint('percentual', { unsigned: true }).notNull().default(0),
    cursosConcluidos: smallint('cursos_concluidos', { unsigned: true }).notNull().default(0),
    cursosConsiderados: smallint('cursos_considerados', { unsigned: true }).notNull().default(0),
    iniciadaEm: timestamp('iniciada_em'),
    concluidaEm: timestamp('concluida_em'),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex('uq_progresso_trilhas_usuario_trilha').on(t.usuarioId, t.trilhaId),
    index('idx_progresso_trilhas_trilha_situacao').on(t.trilhaId, t.situacao),
  ],
);
