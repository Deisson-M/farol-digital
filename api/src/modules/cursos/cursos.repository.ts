import { and, asc, count, desc, eq, gt, like, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { cursos, matriculas } from '../../db/schema/base.js';
import type { CursosRepository } from './cursos.service.js';

const colunas = {
  id: cursos.id,
  slug: cursos.slug,
  titulo: cursos.titulo,
  descricao: cursos.descricao,
  nivel: cursos.nivel,
  cargaHorariaMinutos: cursos.cargaHorariaMinutos,
  precoCentavos: cursos.precoCentavos,
  destaque: cursos.destaque,
  publicado: cursos.publicado,
};

const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

export function criarCursosRepository(db: Database): CursosRepository {
  return {
    async listar(f) {
      const condicoes: SQL[] = [];
      if (!f.incluirRascunhos) condicoes.push(eq(cursos.publicado, true));
      if (f.nivel) condicoes.push(eq(cursos.nivel, f.nivel));
      if (f.preco === 'gratuito') condicoes.push(eq(cursos.precoCentavos, 0));
      if (f.preco === 'pago') condicoes.push(gt(cursos.precoCentavos, 0));
      if (f.destaque) condicoes.push(eq(cursos.destaque, true));
      if (f.busca) {
        const termo = `%${escaparLike(f.busca)}%`;
        const busca = or(like(cursos.titulo, termo), like(cursos.descricao, termo));
        if (busca) condicoes.push(busca);
      }
      const where = condicoes.length ? and(...condicoes) : undefined;
      const [total] = await db.select({ total: count() }).from(cursos).where(where);
      const itens = await db
        .select(colunas)
        .from(cursos)
        .where(where)
        .orderBy(desc(cursos.destaque), asc(sql`field(${cursos.nivel}, 'iniciante', 'intermediario', 'avancado')`), asc(cursos.titulo))
        .limit(f.limite)
        .offset((f.pagina - 1) * f.limite);
      return { itens, total: total?.total ?? 0 };
    },
    async buscarPorId(id) {
      const [c] = await db.select(colunas).from(cursos).where(eq(cursos.id, id)).limit(1);
      return c ?? null;
    },
    async situacaoMatricula(usuarioId, cursoId) {
      const [m] = await db
        .select({ situacao: matriculas.situacao })
        .from(matriculas)
        .where(and(eq(matriculas.usuarioId, usuarioId), eq(matriculas.cursoId, cursoId)))
        .limit(1);
      return m?.situacao ?? null;
    },
    async matricular(usuarioId, cursoId) {
      await db
        .insert(matriculas)
        .values({ usuarioId, cursoId, situacao: 'ativa' })
        .onDuplicateKeyUpdate({
          set: { situacao: sql`IF(${matriculas.situacao} = 'concluida', 'concluida', 'ativa')` },
        });
    },
    async listarMatriculas(usuarioId) {
      return db
        .select({
          cursoId: matriculas.cursoId,
          titulo: cursos.titulo,
          nivel: cursos.nivel,
          cargaHorariaMinutos: cursos.cargaHorariaMinutos,
          situacao: matriculas.situacao,
          progressoPercentual: matriculas.progressoPercentual,
          iniciadoEm: matriculas.iniciadoEm,
          concluidoEm: matriculas.concluidoEm,
        })
        .from(matriculas)
        .innerJoin(cursos, eq(cursos.id, matriculas.cursoId))
        .where(eq(matriculas.usuarioId, usuarioId))
        .orderBy(desc(matriculas.atualizadoEm));
    },
  };
}
