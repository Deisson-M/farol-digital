import { and, asc, count, eq, inArray, like, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { cursos, matriculas } from '../../db/schema/base.js';
import { progressoTrilhas, trilhaCursos, trilhas } from '../../db/schema/trilhas.js';
import type { TrilhaComTotais, TrilhaRegistro, TrilhasRepository } from './trilhas.service.js';

const colunasTrilha = {
  id: trilhas.id,
  slug: trilhas.slug,
  titulo: trilhas.titulo,
  descricao: trilhas.descricao,
  tema: trilhas.tema,
  nivel: trilhas.nivel,
  objetivos: trilhas.objetivos,
  criterioConclusao: trilhas.criterioConclusao,
  percentualMinimo: trilhas.percentualMinimo,
  publicada: trilhas.publicada,
};

/** Escapa curingas do LIKE para que a busca seja literal. */
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

export function criarTrilhasRepository(db: Database): TrilhasRepository {
  return {
    async listar(filtros) {
      const condicoes: SQL[] = [];
      if (!filtros.incluirRascunhos) condicoes.push(eq(trilhas.publicada, true));
      if (filtros.nivel) condicoes.push(eq(trilhas.nivel, filtros.nivel));
      if (filtros.tema) condicoes.push(eq(trilhas.tema, filtros.tema));
      if (filtros.busca) {
        const termo = `%${escaparLike(filtros.busca)}%`;
        const busca = or(like(trilhas.titulo, termo), like(trilhas.descricao, termo));
        if (busca) condicoes.push(busca);
      }
      const where = condicoes.length ? and(...condicoes) : undefined;

      const [totalLinha] = await db.select({ total: count() }).from(trilhas).where(where);

      const linhas = await db
        .select({
          ...colunasTrilha,
          totalCursos: sql<number>`count(${trilhaCursos.id})`.mapWith(Number),
          cargaHorariaTotalMinutos: sql<number>`coalesce(sum(${cursos.cargaHorariaMinutos}), 0)`.mapWith(Number),
        })
        .from(trilhas)
        .leftJoin(trilhaCursos, eq(trilhaCursos.trilhaId, trilhas.id))
        .leftJoin(cursos, eq(cursos.id, trilhaCursos.cursoId))
        .where(where)
        .groupBy(trilhas.id)
        .orderBy(asc(trilhas.nivel), asc(trilhas.titulo))
        .limit(filtros.limite)
        .offset((filtros.pagina - 1) * filtros.limite);

      return { itens: linhas as TrilhaComTotais[], total: totalLinha?.total ?? 0 };
    },

    async buscarPorId(id) {
      const [linha] = await db.select(colunasTrilha).from(trilhas).where(eq(trilhas.id, id)).limit(1);
      return (linha as TrilhaRegistro | undefined) ?? null;
    },

    async slugEmUso(slug, excetoId) {
      const condicao = excetoId ? and(eq(trilhas.slug, slug), ne(trilhas.id, excetoId)) : eq(trilhas.slug, slug);
      const [linha] = await db.select({ id: trilhas.id }).from(trilhas).where(condicao).limit(1);
      return Boolean(linha);
    },

    async listarCursos(trilhaId) {
      return db
        .select({
          cursoId: trilhaCursos.cursoId,
          titulo: cursos.titulo,
          ordem: trilhaCursos.ordem,
          obrigatorio: trilhaCursos.obrigatorio,
          requerAnteriores: trilhaCursos.requerAnteriores,
          cargaHorariaMinutos: cursos.cargaHorariaMinutos,
        })
        .from(trilhaCursos)
        .innerJoin(cursos, eq(cursos.id, trilhaCursos.cursoId))
        .where(eq(trilhaCursos.trilhaId, trilhaId))
        .orderBy(asc(trilhaCursos.ordem));
    },

    async listarMatriculas(usuarioId, cursoIds) {
      if (cursoIds.length === 0) return [];
      return db
        .select({
          cursoId: matriculas.cursoId,
          situacao: matriculas.situacao,
          progressoPercentual: matriculas.progressoPercentual,
        })
        .from(matriculas)
        .where(and(eq(matriculas.usuarioId, usuarioId), inArray(matriculas.cursoId, cursoIds)));
    },

    async buscarProgresso(usuarioId, trilhaId) {
      const [linha] = await db
        .select({
          situacao: progressoTrilhas.situacao,
          iniciadaEm: progressoTrilhas.iniciadaEm,
          concluidaEm: progressoTrilhas.concluidaEm,
        })
        .from(progressoTrilhas)
        .where(and(eq(progressoTrilhas.usuarioId, usuarioId), eq(progressoTrilhas.trilhaId, trilhaId)))
        .limit(1);
      return linha ?? null;
    },

    async salvarProgresso(usuarioId, trilhaId, dados) {
      await db
        .insert(progressoTrilhas)
        .values({ usuarioId, trilhaId, ...dados })
        .onDuplicateKeyUpdate({
          set: {
            situacao: dados.situacao,
            percentual: dados.percentual,
            cursosConcluidos: dados.cursosConcluidos,
            cursosConsiderados: dados.cursosConsiderados,
            iniciadaEm: dados.iniciadaEm,
            concluidaEm: dados.concluidaEm,
          },
        });
    },

    async idsTrilhasDoUsuario(usuarioId) {
      const porMatricula = db
        .selectDistinct({ id: trilhaCursos.trilhaId })
        .from(trilhaCursos)
        .innerJoin(
          matriculas,
          and(
            eq(matriculas.cursoId, trilhaCursos.cursoId),
            eq(matriculas.usuarioId, usuarioId),
            ne(matriculas.situacao, 'cancelada'),
          ),
        );
      const porProgresso = db
        .select({ id: progressoTrilhas.trilhaId })
        .from(progressoTrilhas)
        .where(and(eq(progressoTrilhas.usuarioId, usuarioId), ne(progressoTrilhas.situacao, 'nao_iniciada')));

      const [a, b] = await Promise.all([porMatricula, porProgresso]);
      const ids = [...new Set([...a, ...b].map((l) => l.id))];
      if (ids.length === 0) return [];

      const publicadas = await db
        .select({ id: trilhas.id })
        .from(trilhas)
        .where(and(inArray(trilhas.id, ids), eq(trilhas.publicada, true)));
      return publicadas.map((l) => l.id);
    },

    async cursosExistentes(ids) {
      if (ids.length === 0) return new Set();
      const linhas = await db.select({ id: cursos.id }).from(cursos).where(inArray(cursos.id, ids));
      return new Set(linhas.map((l) => l.id));
    },

    async inserir(dados) {
      const [resultado] = await db.insert(trilhas).values(dados).$returningId();
      if (!resultado) throw new Error('Falha ao inserir trilha.');
      return resultado.id;
    },

    async atualizar(id, dados) {
      await db.update(trilhas).set(dados).where(eq(trilhas.id, id));
    },

    async substituirCursos(trilhaId, linhas) {
      await db.transaction(async (tx) => {
        // Bloqueia a trilha para evitar duas atualizações concorrentes da sequência.
        await tx.select({ id: trilhas.id }).from(trilhas).where(eq(trilhas.id, trilhaId)).for('update');
        await tx.delete(trilhaCursos).where(eq(trilhaCursos.trilhaId, trilhaId));
        if (linhas.length > 0) {
          await tx.insert(trilhaCursos).values(linhas.map((l) => ({ trilhaId, ...l })));
        }
      });
    },
  };
}
