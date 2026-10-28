import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { NIVEIS, SITUACOES_MATRICULA } from '../../db/schema/enums.js';
import { possuiPermissao } from '../../lib/permissoes.js';
import type { CursosService } from './cursos.service.js';

const cursoSchema = z.object({
  id: z.number(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  nivel: z.enum(NIVEIS),
  cargaHorariaMinutos: z.number(),
  precoCentavos: z.number(),
  gratuito: z.boolean(),
  destaque: z.boolean(),
  publicado: z.boolean(),
});

const idParam = z.object({ id: z.coerce.number().int().positive('Identificador inválido.') });

export const cursosRoutes: FastifyPluginAsyncZod<{ service: CursosService }> = async (app, { service }) => {
  app.get(
    '/cursos',
    {
      onRequest: [app.autenticarOpcional],
      schema: {
        tags: ['cursos'],
        summary: 'Catálogo de cursos (gratuitos e pagos)',
        querystring: z.object({
          busca: z.string().trim().max(120).optional(),
          nivel: z.enum(NIVEIS).optional(),
          preco: z.enum(['gratuito', 'pago']).optional(),
          destaque: z
            .enum(['true', 'false'])
            .transform((v) => v === 'true')
            .optional(),
          pagina: z.coerce.number().int().min(1).default(1),
          limite: z.coerce.number().int().min(1).max(200).default(12),
        }),
        response: {
          200: z.object({ itens: z.array(cursoSchema), total: z.number(), pagina: z.number(), limite: z.number() }),
        },
      },
    },
    async (request) => service.listar(request.query, possuiPermissao(request.user?.papelEfetivo, 'cursos:ver-rascunhos')),
  );

  // Rota estática antes de /cursos/:id.
  app.get(
    '/matriculas/minhas',
    {
      onRequest: [app.autenticar],
      schema: {
        tags: ['cursos'],
        response: {
          200: z.object({
            itens: z.array(
              z.object({
                cursoId: z.number(),
                titulo: z.string(),
                nivel: z.enum(NIVEIS),
                cargaHorariaMinutos: z.number(),
                situacao: z.enum(SITUACOES_MATRICULA),
                progressoPercentual: z.number(),
                iniciadoEm: z.string(),
                concluidoEm: z.string().nullable(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => ({ itens: await service.minhasMatriculas(request.user.sub) }),
  );

  app.get(
    '/cursos/:id',
    {
      onRequest: [app.autenticarOpcional],
      schema: {
        tags: ['cursos'],
        params: idParam,
        response: { 200: cursoSchema.extend({ matricula: z.enum(SITUACOES_MATRICULA).nullable() }) },
      },
    },
    async (request) =>
      service.detalhar(
        request.params.id,
        request.user?.sub ?? null,
        possuiPermissao(request.user?.papelEfetivo, 'cursos:ver-rascunhos'),
      ),
  );

  app.post(
    '/cursos/:id/matriculas',
    {
      onRequest: [app.autenticar],
      schema: {
        tags: ['cursos'],
        summary: 'Matrícula em curso gratuito',
        params: idParam,
        response: { 201: z.object({ cursoId: z.number(), situacao: z.literal('ativa') }) },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await service.matricularGratuito(request.user.sub, request.params.id, request.id)),
  );
};
