import { eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { usuarios } from '../../db/schema/base.js';
import { naoEncontrado } from '../../lib/erros.js';
import {
  cadastroBody,
  esqueciSenhaBody,
  loginBody,
  redefinirSenhaBody,
  usuarioPublico,
} from './auth.schemas.js';
import type { AuthService, UsuarioRegistro } from './auth.service.js';

const MENSAGEM_ESQUECI =
  'Se existir uma conta com este e-mail, enviaremos um link para criar uma nova senha. O link vale por 30 minutos.';

const publico = (u: UsuarioRegistro) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  papel: u.papel,
  situacaoDocente: u.situacaoDocente,
});

export const authRoutes: FastifyPluginAsyncZod<{ service: AuthService }> = async (app, { service }) => {
  const sessao = z.object({ token: z.string(), usuario: usuarioPublico });
  const emitirToken = (u: UsuarioRegistro) => app.jwt.sign({ sub: u.id, v: u.sessaoVersao });

  app.post(
    '/auth/cadastro',
    {
      config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
      schema: {
        tags: ['auth'],
        summary: 'Cadastro de aluno ou docente (docente fica pendente de aprovação)',
        body: cadastroBody,
        response: { 201: sessao },
      },
    },
    async (request, reply) => {
      const usuario = await service.cadastrar(request.body, { correlacaoId: request.id });
      return reply.status(201).send({ token: emitirToken(usuario), usuario: publico(usuario) });
    },
  );

  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: { tags: ['auth'], body: loginBody, response: { 200: sessao } },
    },
    async (request) => {
      const usuario = await service.entrar(request.body.email, request.body.senha, { correlacaoId: request.id });
      return { token: emitirToken(usuario), usuario: publico(usuario) };
    },
  );

  app.post(
    '/auth/esqueci-senha',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: { tags: ['auth'], body: esqueciSenhaBody, response: { 202: z.object({ mensagem: z.string() }) } },
    },
    async (request, reply) => {
      await service.solicitarRedefinicao(request.body.email, env.APP_URL, { correlacaoId: request.id });
      return reply.status(202).send({ mensagem: MENSAGEM_ESQUECI });
    },
  );

  app.post(
    '/auth/redefinir-senha',
    {
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
      schema: { tags: ['auth'], body: redefinirSenhaBody, response: { 200: z.object({ mensagem: z.string() }) } },
    },
    async (request) => {
      await service.redefinirSenha(request.body.token, request.body.novaSenha, { correlacaoId: request.id });
      return { mensagem: 'Senha alterada. Entre com a nova senha.' };
    },
  );

  app.post(
    '/auth/logout',
    { onRequest: [app.autenticar], schema: { tags: ['auth'], response: { 204: z.null() } } },
    async (request, reply) => {
      // JWT é stateless: o cliente descarta o token. O evento fica registrado para rastreabilidade.
      await app.auditoria.registrar({
        usuarioId: request.user.sub,
        acao: 'auth.logout',
        recursoTipo: 'sessao',
        resultado: 'sucesso',
        correlacaoId: request.id,
      });
      return reply.status(204).send(null);
    },
  );

  app.get(
    '/auth/me',
    { onRequest: [app.autenticar], schema: { tags: ['auth'], response: { 200: usuarioPublico } } },
    async (request) => {
      const [u] = await app.db
        .select({
          id: usuarios.id,
          nome: usuarios.nome,
          email: usuarios.email,
          papel: usuarios.papel,
          situacaoDocente: usuarios.situacaoDocente,
        })
        .from(usuarios)
        .where(eq(usuarios.id, request.user.sub))
        .limit(1);
      if (!u) throw naoEncontrado('Usuário');
      return u;
    },
  );
};
