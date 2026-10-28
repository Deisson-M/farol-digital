import {
  char,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { cursos, usuarios } from './base.js';
import { METODOS_PAGAMENTO, SITUACOES_PAGAMENTO, SITUACOES_PEDIDO } from './enums.js';

/** Pedido de compra de um curso pago. O valor é copiado do curso no momento da criação. */
export const pedidos = mysqlTable(
  'pedidos',
  {
    id: int('id').autoincrement().primaryKey(),
    /** Identificador público e não sequencial (UUID). */
    codigo: char('codigo', { length: 36 }).notNull(),
    usuarioId: int('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'restrict' }),
    cursoId: int('curso_id')
      .notNull()
      .references(() => cursos.id, { onDelete: 'restrict' }),
    valorCentavos: int('valor_centavos', { unsigned: true }).notNull(),
    situacao: mysqlEnum('situacao', SITUACOES_PEDIDO).notNull().default('aguardando_pagamento'),
    pagoEm: timestamp('pago_em'),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex('uq_pedidos_codigo').on(t.codigo),
    index('idx_pedidos_usuario_curso').on(t.usuarioId, t.cursoId, t.situacao),
  ],
);

/**
 * Tentativas de pagamento de um pedido. Nunca armazena número completo de
 * cartão, CVV ou CPF completo — somente bandeira, 4 últimos dígitos e CPF mascarado.
 */
export const pagamentos = mysqlTable(
  'pagamentos',
  {
    id: int('id').autoincrement().primaryKey(),
    codigo: char('codigo', { length: 36 }).notNull(),
    pedidoId: int('pedido_id')
      .notNull()
      .references(() => pedidos.id, { onDelete: 'restrict' }),
    metodo: mysqlEnum('metodo', METODOS_PAGAMENTO).notNull(),
    situacao: mysqlEnum('situacao', SITUACOES_PAGAMENTO).notNull().default('pendente'),
    valorCentavos: int('valor_centavos', { unsigned: true }).notNull(),
    parcelas: tinyint('parcelas', { unsigned: true }).notNull().default(1),
    chaveIdempotencia: varchar('chave_idempotencia', { length: 80 }).notNull(),
    provedor: varchar('provedor', { length: 40 }).notNull(),
    referenciaProvedor: varchar('referencia_provedor', { length: 120 }),
    cartaoBandeira: varchar('cartao_bandeira', { length: 20 }),
    cartaoFinal: char('cartao_final', { length: 4 }),
    pagadorDocumentoMascarado: varchar('pagador_documento_mascarado', { length: 20 }),
    pixCopiaCola: text('pix_copia_cola'),
    boletoLinhaDigitavel: varchar('boleto_linha_digitavel', { length: 60 }),
    boletoVencimento: date('boleto_vencimento', { mode: 'string' }),
    urlAprovacao: varchar('url_aprovacao', { length: 500 }),
    expiraEm: timestamp('expira_em'),
    motivoRecusa: varchar('motivo_recusa', { length: 200 }),
    confirmadoEm: timestamp('confirmado_em'),
    criadoEm: timestamp('criado_em').notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em').notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex('uq_pagamentos_codigo').on(t.codigo),
    uniqueIndex('uq_pagamentos_idempotencia').on(t.pedidoId, t.chaveIdempotencia),
    uniqueIndex('uq_pagamentos_provedor_ref').on(t.provedor, t.referenciaProvedor),
    index('idx_pagamentos_pedido_situacao').on(t.pedidoId, t.situacao),
  ],
);
