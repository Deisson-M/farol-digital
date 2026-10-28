import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';
import type { Papel, SituacaoDocente } from '../db/schema/enums.js';
import { naoAutenticado, proibido } from '../lib/erros.js';
import { possuiPermissao, type Permissao } from '../lib/permissoes.js';
import { papelEfetivo } from '../modules/auth/auth.regras.js';

/** Conteúdo do JWT: só o identificador e a versão da sessão (nada pessoal). */
export interface TokenPayload {
  sub: number;
  v: number;
}

/** Usuário da requisição, recarregado do banco a cada chamada autenticada. */
export interface UsuarioSessao {
  sub: number;
  nome: string;
  papel: Papel;
  /** Papel usado para autorização (docente pendente = estudante). */
  papelEfetivo: Papel;
  situacaoDocente: SituacaoDocente;
}

export interface DadosSessao {
  nome: string;
  papel: Papel;
  situacaoDocente: SituacaoDocente;
  ativo: boolean;
  sessaoVersao: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: UsuarioSessao;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Exige token válido, conta ativa e sessão não revogada. */
    autenticar: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Autentica se houver token; segue anônimo sem token. Token inválido gera 401. */
    autenticarOpcional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Exige autenticação e a permissão informada. */
    exigirPermissao: (permissao: Permissao) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export interface OpcoesAuth {
  carregarSessao: (usuarioId: number) => Promise<DadosSessao | null>;
}

const SESSAO_INVALIDA = 'Sessão inválida ou expirada. Entre novamente.';

async function authPlugin(app: FastifyInstance, { carregarSessao }: OpcoesAuth) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  async function verificar(request: FastifyRequest) {
    let payload: TokenPayload;
    try {
      payload = await request.jwtVerify<TokenPayload>();
    } catch {
      throw naoAutenticado(SESSAO_INVALIDA);
    }
    const dados = await carregarSessao(payload.sub);
    // Conta desativada ou senha trocada depois da emissão do token: sessão revogada.
    if (!dados || !dados.ativo || dados.sessaoVersao !== payload.v) throw naoAutenticado(SESSAO_INVALIDA);
    request.user = {
      sub: payload.sub,
      nome: dados.nome,
      papel: dados.papel,
      papelEfetivo: papelEfetivo(dados.papel, dados.situacaoDocente),
      situacaoDocente: dados.situacaoDocente,
    };
  }

  app.decorate('autenticar', async (request: FastifyRequest) => verificar(request));

  app.decorate('autenticarOpcional', async (request: FastifyRequest) => {
    if (!request.headers.authorization) return;
    await verificar(request);
  });

  app.decorate('exigirPermissao', (permissao: Permissao) => {
    return async (request: FastifyRequest) => {
      await verificar(request);
      if (!possuiPermissao(request.user.papelEfetivo, permissao)) throw proibido();
    };
  });
}

export default fp(authPlugin, { name: 'auth' });
