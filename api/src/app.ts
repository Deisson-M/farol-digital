import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './config/env.js';
import './lib/zod-pt.js';
import type { Database } from './db/client.js';
import { usuarios } from './db/schema/base.js';
import { criarRegistroAuditoria } from './modules/auditoria/auditoria.repository.js';
import type { RegistroAuditoria } from './modules/auditoria/auditoria.service.js';
import { criarAuthRepository } from './modules/auth/auth.repository.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { AuthService, type Notificador } from './modules/auth/auth.service.js';
import { criarCursosRepository } from './modules/cursos/cursos.repository.js';
import { cursosRoutes } from './modules/cursos/cursos.routes.js';
import { CursosService } from './modules/cursos/cursos.service.js';
import { docentesRoutes } from './modules/docentes/docentes.routes.js';
import { criarPagamentosRepository } from './modules/pagamentos/pagamentos.repository.js';
import { pagamentosRoutes } from './modules/pagamentos/pagamentos.routes.js';
import { PagamentosService } from './modules/pagamentos/pagamentos.service.js';
import { ProvedorSimulado } from './modules/pagamentos/provedores.js';
import { criarTrilhasRepository } from './modules/trilhas/trilhas.repository.js';
import { trilhasRoutes } from './modules/trilhas/trilhas.routes.js';
import { TrilhasService } from './modules/trilhas/trilhas.service.js';
import authPlugin from './plugins/auth.js';
import errosPlugin from './plugins/erros.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    auditoria: RegistroAuditoria;
  }
}

export interface OpcoesApp {
  db: Database;
  logger?: FastifyServerOptions['logger'];
}

const CABECALHO_CORRELACAO = 'x-correlation-id';
const correlacaoValida = /^[A-Za-z0-9._-]{8,64}$/;

export async function construirApp({ db, logger = true }: OpcoesApp) {
  const app = Fastify({
    logger,
    // Reaproveita o ID de correlação do cliente quando seguro; senão gera um UUID.
    genReqId: (req) => {
      const recebido = req.headers[CABECALHO_CORRELACAO];
      return typeof recebido === 'string' && correlacaoValida.test(recebido) ? recebido : randomUUID();
    },
    requestIdHeader: false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook('onSend', async (request, reply) => {
    reply.header(CABECALHO_CORRELACAO, request.id);
  });

  app.decorate('db', db);
  app.decorate('auditoria', criarRegistroAuditoria(db));

  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', CABECALHO_CORRELACAO],
    exposedHeaders: [CABECALHO_CORRELACAO],
  });
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });
  await app.register(errosPlugin);
  await app.register(authPlugin, {
    carregarSessao: async (id: number) => {
      const [u] = await db
        .select({
          nome: usuarios.nome,
          papel: usuarios.papel,
          situacaoDocente: usuarios.situacaoDocente,
          ativo: usuarios.ativo,
          sessaoVersao: usuarios.sessaoVersao,
        })
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1);
      return u ?? null;
    },
  });

  app.get('/health', { hide: true }, async () => ({ status: 'ok' }));

  const notificador: Notificador = {
    // Sem provedor de e-mail configurado: o link aparece apenas no log do servidor (desenvolvimento).
    async enviarRedefinicaoSenha(destino, link) {
      if (env.NODE_ENV === 'production') {
        app.log.error('Nenhum provedor de e-mail configurado: link de redefinição não enviado.');
        return;
      }
      app.log.info({ destinatario: destino.email }, `[DEV] Link de redefinição de senha: ${link}`);
    },
  };
  const hasher = { hash: (s: string) => bcrypt.hash(s, 12), comparar: (s: string, h: string) => bcrypt.compare(s, h) };

  const authService = new AuthService(criarAuthRepository(db), hasher, notificador, app.auditoria);
  const cursosService = new CursosService(criarCursosRepository(db), app.auditoria);
  const trilhasService = new TrilhasService(criarTrilhasRepository(db), app.auditoria);
  const pagamentosService = new PagamentosService(
    criarPagamentosRepository(db),
    new ProvedorSimulado(env.APP_URL),
    app.auditoria,
  );

  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { service: authService });
      await v1.register(cursosRoutes, { service: cursosService });
      await v1.register(trilhasRoutes, { service: trilhasService });
      await v1.register(pagamentosRoutes, { service: pagamentosService });
      await v1.register(docentesRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}
