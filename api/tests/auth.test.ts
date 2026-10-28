import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { ErroAplicacao } from '../src/lib/erros.js';
import type { EventoAuditoria } from '../src/modules/auditoria/auditoria.service.js';
import { hashToken, normalizarTelefone, papelEfetivo, validarSenha } from '../src/modules/auth/auth.regras.js';
import {
  AuthService,
  type AuthRepository,
  type NovoUsuario,
  type UsuarioRegistro,
} from '../src/modules/auth/auth.service.js';

class RepoMemoria implements AuthRepository {
  usuarios: Array<UsuarioRegistro & Partial<NovoUsuario>> = [];
  redefinicoes: Array<{ id: number; usuarioId: number; tokenHash: string; expiraEm: Date; usadoEm: Date | null }> = [];
  async buscarPorEmail(email: string) {
    return this.usuarios.find((u) => u.email === email) ?? null;
  }
  async buscarPorId(id: number) {
    return this.usuarios.find((u) => u.id === id) ?? null;
  }
  async inserir(d: NovoUsuario) {
    const id = this.usuarios.length + 1;
    this.usuarios.push({ ...d, id, ativo: true, sessaoVersao: 1 });
    return id;
  }
  async atualizarSenha(id: number, senhaHash: string) {
    const u = this.usuarios.find((x) => x.id === id)!;
    u.senhaHash = senhaHash;
    u.sessaoVersao++;
  }
  async criarRedefinicao(usuarioId: number, tokenHash: string, expiraEm: Date) {
    this.redefinicoes.push({ id: this.redefinicoes.length + 1, usuarioId, tokenHash, expiraEm, usadoEm: null });
  }
  async buscarRedefinicao(tokenHash: string) {
    return this.redefinicoes.find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async encerrarRedefinicoes(usuarioId: number, quando: Date) {
    for (const r of this.redefinicoes) if (r.usuarioId === usuarioId && !r.usadoEm) r.usadoEm = quando;
  }
}

// Hasher determinístico para teste (a aplicação usa bcrypt).
const hasher = { hash: async (s: string) => `h:${s}`, comparar: async (s: string, h: string) => h === `h:${s}` };

async function esperarErro(p: Promise<unknown>, status: number) {
  await assert.rejects(p, (e: unknown) => e instanceof ErroAplicacao && e.status === status);
}

describe('regras de autenticação', () => {
  it('valida força da senha', () => {
    assert.deepEqual(validarSenha('Farol2026'), []);
    assert.equal(validarSenha('curta1').length, 1);
    assert.ok(validarSenha('somenteletras').some((p) => p.includes('número')));
    assert.ok(validarSenha('12345678').some((p) => p.includes('letra')));
    assert.ok(validarSenha('ana@x.com1', 'ana@x.com1').some((p) => p.includes('e-mail')));
  });

  it('docente pendente usa permissões de estudante', () => {
    assert.equal(papelEfetivo('professor', 'pendente'), 'estudante');
    assert.equal(papelEfetivo('professor', 'recusado'), 'estudante');
    assert.equal(papelEfetivo('professor', 'aprovado'), 'professor');
    assert.equal(papelEfetivo('admin', 'nao_se_aplica'), 'admin');
  });

  it('normaliza telefone', () => {
    assert.equal(normalizarTelefone('+55 (61) 99999-1234'), '61999991234');
    assert.equal(normalizarTelefone(''), null);
  });
});

describe('AuthService', () => {
  let repo: RepoMemoria;
  let eventos: EventoAuditoria[];
  let links: string[];
  let agora: Date;
  let service: AuthService;
  const ctx = { correlacaoId: 'teste-auth-0001' };

  beforeEach(() => {
    repo = new RepoMemoria();
    eventos = [];
    links = [];
    agora = new Date('2026-10-20T12:00:00Z');
    service = new AuthService(
      repo,
      hasher,
      { enviarRedefinicaoSenha: async (_d, link) => void links.push(link) },
      { registrar: async (e) => void eventos.push(e) },
      () => agora,
    );
  });

  const aluno = {
    tipo: 'aluno' as const,
    nome: 'Bruno Souza',
    email: 'bruno@exemplo.com',
    senha: 'Senha2026',
    aceiteTermos: true as const,
    telefone: '(61) 99999-1234',
  };

  it('cadastra aluno com termos aceitos e senha com hash', async () => {
    const u = await service.cadastrar(aluno, ctx);
    assert.equal(u.papel, 'estudante');
    assert.equal(u.situacaoDocente, 'nao_se_aplica');
    const salvo = repo.usuarios[0]!;
    assert.equal(salvo.senhaHash, 'h:Senha2026');
    assert.equal(salvo.telefone, '61999991234');
    assert.ok(salvo.termosVersao);
    assert.equal(eventos[0]?.acao, 'usuario.cadastrar');
  });

  it('cadastra docente como pendente de aprovação', async () => {
    const u = await service.cadastrar(
      { ...aluno, tipo: 'docente', email: 'prof@exemplo.com', areaAtuacao: 'Matemática' },
      ctx,
    );
    assert.equal(u.papel, 'professor');
    assert.equal(u.situacaoDocente, 'pendente');
    assert.equal(papelEfetivo(u.papel, u.situacaoDocente), 'estudante');
  });

  it('recusa e-mail duplicado (409) e senha fraca (422)', async () => {
    await service.cadastrar(aluno, ctx);
    await esperarErro(service.cadastrar(aluno, ctx), 409);
    await esperarErro(service.cadastrar({ ...aluno, email: 'outro@exemplo.com', senha: 'semnumeros' }, ctx), 422);
  });

  it('login: senha errada e e-mail inexistente dão o mesmo erro', async () => {
    await service.cadastrar(aluno, ctx);
    await esperarErro(service.entrar('bruno@exemplo.com', 'errada', ctx), 401);
    await esperarErro(service.entrar('ninguem@exemplo.com', 'Senha2026', ctx), 401);
    assert.equal((await service.entrar('bruno@exemplo.com', 'Senha2026', ctx)).id, 1);
  });

  it('esqueci senha não revela se o e-mail existe e não gera link para conta inexistente', async () => {
    await service.solicitarRedefinicao('ninguem@exemplo.com', 'http://app', ctx);
    assert.equal(links.length, 0);
    assert.equal(repo.redefinicoes.length, 0);
  });

  it('fluxo completo de redefinição: token de uso único, só hash no banco, sessão antiga revogada', async () => {
    await service.cadastrar(aluno, ctx);
    await service.solicitarRedefinicao('bruno@exemplo.com', 'http://app/', ctx);
    assert.equal(links.length, 1);
    const token = new URL(links[0]!).searchParams.get('token')!;
    assert.match(links[0]!, /^http:\/\/app\/redefinir-senha\?token=/);
    assert.equal(repo.redefinicoes[0]?.tokenHash, hashToken(token));
    assert.notEqual(repo.redefinicoes[0]?.tokenHash, token);

    await service.redefinirSenha(token, 'NovaSenha99', ctx);
    assert.equal(repo.usuarios[0]?.senhaHash, 'h:NovaSenha99');
    assert.equal(repo.usuarios[0]?.sessaoVersao, 2);
    await esperarErro(service.redefinirSenha(token, 'OutraSenha77', ctx), 422);
  });

  it('link expira em 30 minutos e um novo pedido invalida o anterior', async () => {
    await service.cadastrar(aluno, ctx);
    await service.solicitarRedefinicao('bruno@exemplo.com', 'http://app', ctx);
    const primeiro = new URL(links[0]!).searchParams.get('token')!;
    await service.solicitarRedefinicao('bruno@exemplo.com', 'http://app', ctx);
    await esperarErro(service.redefinirSenha(primeiro, 'NovaSenha99', ctx), 422);

    const segundo = new URL(links[1]!).searchParams.get('token')!;
    agora = new Date(agora.getTime() + 31 * 60 * 1000);
    await esperarErro(service.redefinirSenha(segundo, 'NovaSenha99', ctx), 422);
  });
});
