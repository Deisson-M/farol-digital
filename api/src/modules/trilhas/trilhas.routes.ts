import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { possuiPermissao } from '../../lib/permissoes.js';
import {
  atualizarTrilhaBody,
  criarTrilhaBody,
  definirCursosBody,
  filtrosCatalogo,
  idParam,
  minhaTrilhaSchema,
  paginaTrilhasSchema,
  progressoTrilhaSchema,
  trilhaDetalheSchema,
} from './trilhas.schemas.js';
import { TrilhasService } from './trilhas.service.js';

export const trilhasRoutes: FastifyPluginAsyncZod<{ service: TrilhasService }> = async (app, { service }) => {
  // ---------- Área pública / estudante ----------

  app.get(
    '/trilhas',
    {
      onRequest: [app.autenticarOpcional],
      schema: {
        tags: ['trilhas'],
        summary: 'Catálogo de trilhas (publicadas; gestores também veem rascunhos)',
        querystring: filtrosCatalogo,
        response: { 200: paginaTrilhasSchema },
      },
    },
    async (request) =>
      service.listar(request.query, possuiPermissao(request.user?.papelEfetivo, 'trilhas:ver-rascunhos')),
  );

  // Rota estática registrada antes de /trilhas/:id (o roteador prioriza rotas estáticas).
  app.get(
    '/trilhas/minhas',
    {
      onRequest: [app.autenticar],
      schema: {
        tags: ['trilhas'],
        summary: 'Trilhas em que o usuário tem progresso ou matrícula',
        response: { 200: z.object({ itens: z.array(minhaTrilhaSchema) }) },
      },
    },
    async (request) => ({ itens: await service.minhas(request.user.sub) }),
  );

  app.get(
    '/trilhas/:id',
    {
      onRequest: [app.autenticarOpcional],
      schema: {
        tags: ['trilhas'],
        summary: 'Detalhes da trilha',
        params: idParam,
        response: { 200: trilhaDetalheSchema },
      },
    },
    async (request) =>
      service.detalhar(request.params.id, possuiPermissao(request.user?.papelEfetivo, 'trilhas:ver-rascunhos')),
  );

  app.get(
    '/trilhas/:id/progresso',
    {
      onRequest: [app.autenticar],
      schema: {
        tags: ['trilhas'],
        summary: 'Progresso do usuário autenticado na trilha (recalculado a partir das matrículas)',
        params: idParam,
        response: { 200: progressoTrilhaSchema },
      },
    },
    async (request) => service.progresso(request.user.sub, request.params.id),
  );

  // ---------- Gestão (admin e coordenador) ----------

  const gestor = app.exigirPermissao('trilhas:gerenciar');
  const ctx = (request: { user: { sub: number }; id: string }) => ({
    usuarioId: request.user.sub,
    correlacaoId: request.id,
  });

  app.post(
    '/admin/trilhas',
    {
      onRequest: [gestor],
      schema: {
        tags: ['admin', 'trilhas'],
        summary: 'Criar trilha (nasce como rascunho)',
        body: criarTrilhaBody,
        response: { 201: trilhaDetalheSchema },
      },
    },
    async (request, reply) => reply.status(201).send(await service.criar(request.body, ctx(request))),
  );

  app.patch(
    '/admin/trilhas/:id',
    {
      onRequest: [gestor],
      schema: {
        tags: ['admin', 'trilhas'],
        summary: 'Atualizar dados, publicar ou despublicar trilha',
        params: idParam,
        body: atualizarTrilhaBody,
        response: { 200: trilhaDetalheSchema },
      },
    },
    async (request) => service.atualizar(request.params.id, request.body, ctx(request)),
  );

  app.put(
    '/admin/trilhas/:id/cursos',
    {
      onRequest: [gestor],
      schema: {
        tags: ['admin', 'trilhas'],
        summary: 'Substituir a sequência de cursos (a ordem do array define a ordem na trilha)',
        params: idParam,
        body: definirCursosBody,
        response: { 200: trilhaDetalheSchema },
      },
    },
    async (request) => service.definirCursos(request.params.id, request.body.cursos, ctx(request)),
  );
};
