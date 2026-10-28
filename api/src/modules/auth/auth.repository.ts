import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { redefinicoesSenha, usuarios } from '../../db/schema/base.js';
import type { AuthRepository } from './auth.service.js';

const colunas = {
  id: usuarios.id,
  nome: usuarios.nome,
  email: usuarios.email,
  senhaHash: usuarios.senhaHash,
  papel: usuarios.papel,
  ativo: usuarios.ativo,
  situacaoDocente: usuarios.situacaoDocente,
  sessaoVersao: usuarios.sessaoVersao,
};

export function criarAuthRepository(db: Database): AuthRepository {
  return {
    async buscarPorEmail(email) {
      const [u] = await db.select(colunas).from(usuarios).where(eq(usuarios.email, email)).limit(1);
      return u ?? null;
    },
    async buscarPorId(id) {
      const [u] = await db.select(colunas).from(usuarios).where(eq(usuarios.id, id)).limit(1);
      return u ?? null;
    },
    async inserir(dados) {
      const [r] = await db.insert(usuarios).values(dados).$returningId();
      if (!r) throw new Error('Falha ao inserir usuário.');
      return r.id;
    },
    async atualizarSenha(usuarioId, senhaHash) {
      await db
        .update(usuarios)
        .set({ senhaHash, sessaoVersao: sql`${usuarios.sessaoVersao} + 1` })
        .where(eq(usuarios.id, usuarioId));
    },
    async criarRedefinicao(usuarioId, tokenHash, expiraEm) {
      await db.insert(redefinicoesSenha).values({ usuarioId, tokenHash, expiraEm });
    },
    async buscarRedefinicao(tokenHash) {
      const [r] = await db
        .select({
          id: redefinicoesSenha.id,
          usuarioId: redefinicoesSenha.usuarioId,
          expiraEm: redefinicoesSenha.expiraEm,
          usadoEm: redefinicoesSenha.usadoEm,
        })
        .from(redefinicoesSenha)
        .where(eq(redefinicoesSenha.tokenHash, tokenHash))
        .limit(1);
      return r ?? null;
    },
    async encerrarRedefinicoes(usuarioId, quando) {
      await db
        .update(redefinicoesSenha)
        .set({ usadoEm: quando })
        .where(and(eq(redefinicoesSenha.usuarioId, usuarioId), isNull(redefinicoesSenha.usadoEm)));
    },
  };
}
