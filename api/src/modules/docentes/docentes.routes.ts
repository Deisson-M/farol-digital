import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { usuarios } from '../../db/schema/base.js';
import { SITUACOES_DOCENTE } from '../../db/schema/enums.js';
import { naoEncontrado, regraNegocio } from '../../lib/erros.js';

/** Aprovação de cadastros de docentes (admin e coordenação). */
export const docentesRoutes: FastifyPluginAsyncZod = async (app) => {
  const aprovador = app.exigirPermissao('docentes:aprovar');

  app.get(
    '/admin/docentes',
    {
      onRequest: [aprovador],
      schema: {
        tags: ['admin', 'docentes'],
        querystring: z.object({ situacao: z.enum(SITUACOES_DOCENTE).default('pendente') }),
        response: {
          200: z.object({
            itens: z.array(
              z.object({
                id: z.number(),
                nome: z.string(),
                email: z.string(),
                areaAtuacao: z.string().nullable(),
                situacaoDocente: z.enum(SITUACOES_DOCENTE),
                criadoEm: z.string(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const linhas = await app.db
        .select({
          id: usuarios.id,
          nome: usuarios.nome,
          email: usuarios.email,
          areaAtuacao: usuarios.areaAtuacao,
          situacaoDocente: usuarios.situacaoDocente,
          criadoEm: usuarios.criadoEm,
        })
        .from(usuarios)
        .where(and(eq(usuarios.papel, 'professor'), eq(usuarios.situacaoDocente, request.query.situacao)))
        .orderBy(desc(usuarios.criadoEm))
        .limit(100);
      return { itens: linhas.map((l) => ({ ...l, criadoEm: l.criadoEm.toISOString() })) };
    },
  );

  app.patch(
    '/admin/docentes/:id',
    {
      onRequest: [aprovador],
      schema: {
        tags: ['admin', 'docentes'],
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z
          .object({
            decisao: z.enum(['aprovado', 'recusado']),
            justificativa: z.string().trim().max(500).optional(),
          })
          .strict()
          .refine((b) => b.decisao === 'aprovado' || (b.justificativa?.length ?? 0) >= 5, {
            message: 'Informe a justificativa da recusa.',
            path: ['justificativa'],
          }),
        response: { 200: z.object({ id: z.number(), situacaoDocente: z.enum(SITUACOES_DOCENTE) }) },
      },
    },
    async (request) => {
      const { id } = request.params;
      const [docente] = await app.db
        .select({ papel: usuarios.papel, situacaoDocente: usuarios.situacaoDocente })
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1);
      if (!docente || docente.papel !== 'professor') throw naoEncontrado('Professor');
      if (docente.situacaoDocente === request.body.decisao) {
        throw regraNegocio(`Este cadastro já está ${request.body.decisao}.`);
      }

      await app.db.update(usuarios).set({ situacaoDocente: request.body.decisao }).where(eq(usuarios.id, id));
      await app.auditoria.registrar({
        usuarioId: request.user.sub,
        acao: request.body.decisao === 'aprovado' ? 'docente.aprovar' : 'docente.recusar',
        recursoTipo: 'usuario',
        recursoId: id,
        resultado: 'sucesso',
        correlacaoId: request.id,
        justificativa: request.body.justificativa ?? null,
        detalhes: { situacaoAnterior: docente.situacaoDocente },
      });
      return { id, situacaoDocente: request.body.decisao };
    },
  );
};
