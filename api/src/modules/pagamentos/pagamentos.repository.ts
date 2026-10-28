import { and, asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { cursos, matriculas } from '../../db/schema/base.js';
import { pagamentos, pedidos } from '../../db/schema/pagamentos.js';
import type { PagamentoRegistro, PagamentosRepository, PedidoRegistro } from './pagamentos.service.js';

const colPedido = {
  id: pedidos.id,
  codigo: pedidos.codigo,
  usuarioId: pedidos.usuarioId,
  cursoId: pedidos.cursoId,
  valorCentavos: pedidos.valorCentavos,
  situacao: pedidos.situacao,
  pagoEm: pedidos.pagoEm,
  criadoEm: pedidos.criadoEm,
};

const colPagamento = {
  id: pagamentos.id,
  codigo: pagamentos.codigo,
  pedidoId: pagamentos.pedidoId,
  metodo: pagamentos.metodo,
  situacao: pagamentos.situacao,
  valorCentavos: pagamentos.valorCentavos,
  parcelas: pagamentos.parcelas,
  provedor: pagamentos.provedor,
  referenciaProvedor: pagamentos.referenciaProvedor,
  cartaoBandeira: pagamentos.cartaoBandeira,
  cartaoFinal: pagamentos.cartaoFinal,
  pixCopiaCola: pagamentos.pixCopiaCola,
  boletoLinhaDigitavel: pagamentos.boletoLinhaDigitavel,
  boletoVencimento: pagamentos.boletoVencimento,
  urlAprovacao: pagamentos.urlAprovacao,
  expiraEm: pagamentos.expiraEm,
  motivoRecusa: pagamentos.motivoRecusa,
  confirmadoEm: pagamentos.confirmadoEm,
  criadoEm: pagamentos.criadoEm,
};

const um = <T>(linhas: T[]) => linhas[0] ?? null;

export function criarPagamentosRepository(db: Database): PagamentosRepository {
  const buscarPagamento = async (condicao: ReturnType<typeof eq>) =>
    um(await db.select(colPagamento).from(pagamentos).where(condicao).limit(1)) as PagamentoRegistro | null;

  return {
    async buscarCurso(id) {
      return um(
        await db
          .select({ id: cursos.id, titulo: cursos.titulo, precoCentavos: cursos.precoCentavos, publicado: cursos.publicado })
          .from(cursos)
          .where(eq(cursos.id, id))
          .limit(1),
      );
    },
    async situacaoMatricula(usuarioId, cursoId) {
      const linha = um(
        await db
          .select({ situacao: matriculas.situacao })
          .from(matriculas)
          .where(and(eq(matriculas.usuarioId, usuarioId), eq(matriculas.cursoId, cursoId)))
          .limit(1),
      );
      return linha?.situacao ?? null;
    },
    async buscarPedidoAberto(usuarioId, cursoId) {
      return um(
        await db
          .select(colPedido)
          .from(pedidos)
          .where(and(eq(pedidos.usuarioId, usuarioId), eq(pedidos.cursoId, cursoId), eq(pedidos.situacao, 'aguardando_pagamento')))
          .limit(1),
      ) as PedidoRegistro | null;
    },
    async inserirPedido(dados) {
      await db.insert(pedidos).values(dados);
    },
    async buscarPedidoPorCodigo(codigo) {
      return um(await db.select(colPedido).from(pedidos).where(eq(pedidos.codigo, codigo)).limit(1)) as PedidoRegistro | null;
    },
    async buscarPedidoPorId(id) {
      return um(await db.select(colPedido).from(pedidos).where(eq(pedidos.id, id)).limit(1)) as PedidoRegistro | null;
    },
    async buscarPagamentoPorChave(pedidoId, chave) {
      return um(
        await db
          .select(colPagamento)
          .from(pagamentos)
          .where(and(eq(pagamentos.pedidoId, pedidoId), eq(pagamentos.chaveIdempotencia, chave)))
          .limit(1),
      ) as PagamentoRegistro | null;
    },
    buscarPagamentoPorCodigo: (codigo) => buscarPagamento(eq(pagamentos.codigo, codigo)),
    buscarPagamentoPorId: (id) => buscarPagamento(eq(pagamentos.id, id)),
    async buscarPagamentoPorReferencia(provedor, referencia) {
      return um(
        await db
          .select(colPagamento)
          .from(pagamentos)
          .where(and(eq(pagamentos.provedor, provedor), eq(pagamentos.referenciaProvedor, referencia)))
          .limit(1),
      ) as PagamentoRegistro | null;
    },
    async listarPagamentos(pedidoId) {
      return (await db.select(colPagamento).from(pagamentos).where(eq(pagamentos.pedidoId, pedidoId)).orderBy(asc(pagamentos.id))) as PagamentoRegistro[];
    },
    async inserirPagamento(dados) {
      await db.insert(pagamentos).values(dados);
    },
    async atualizarPagamento(id, dados) {
      const { id: _id, codigo: _c, pedidoId: _p, criadoEm: _cr, ...permitidos } = dados;
      await db.update(pagamentos).set(permitidos).where(eq(pagamentos.id, id));
    },
    async mudarSituacaoSePendente(id, situacao, quando, motivo) {
      const [resultado] = await db
        .update(pagamentos)
        .set({
          situacao,
          motivoRecusa: motivo ?? null,
          confirmadoEm: situacao === 'aprovado' ? quando : null,
        })
        .where(and(eq(pagamentos.id, id), eq(pagamentos.situacao, 'pendente')));
      return resultado.affectedRows === 1;
    },
    async marcarPedidoPago(pedidoId, quando) {
      await db
        .update(pedidos)
        .set({ situacao: 'pago', pagoEm: quando })
        .where(and(eq(pedidos.id, pedidoId), eq(pedidos.situacao, 'aguardando_pagamento')));
    },
    async garantirMatricula(usuarioId, cursoId) {
      await db
        .insert(matriculas)
        .values({ usuarioId, cursoId, situacao: 'ativa' })
        // Reativa matrícula cancelada/trancada, mas nunca rebaixa uma já concluída.
        .onDuplicateKeyUpdate({
          set: { situacao: sql`IF(${matriculas.situacao} = 'concluida', 'concluida', 'ativa')` },
        });
    },
  };
}

