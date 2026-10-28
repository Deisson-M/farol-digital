import type { Papel, SituacaoDocente } from '../../db/schema/enums.js';
import { conflito, naoAutenticado, regraNegocio } from '../../lib/erros.js';
import type { RegistroAuditoria } from '../auditoria/auditoria.service.js';
import {
  gerarTokenRedefinicao,
  hashToken,
  normalizarTelefone,
  VALIDADE_REDEFINICAO_MS,
  validarSenha,
  VERSAO_TERMOS,
} from './auth.regras.js';
import type { CadastroDados } from './auth.schemas.js';

export interface UsuarioRegistro {
  id: number;
  nome: string;
  email: string;
  senhaHash: string;
  papel: Papel;
  ativo: boolean;
  situacaoDocente: SituacaoDocente;
  sessaoVersao: number;
}

export interface NovoUsuario {
  nome: string;
  email: string;
  senhaHash: string;
  papel: Papel;
  telefone: string | null;
  areaAtuacao: string | null;
  situacaoDocente: SituacaoDocente;
  termosVersao: string;
  termosAceitosEm: Date;
}

export interface AuthRepository {
  buscarPorEmail(email: string): Promise<UsuarioRegistro | null>;
  buscarPorId(id: number): Promise<UsuarioRegistro | null>;
  inserir(dados: NovoUsuario): Promise<number>;
  /** Troca o hash e incrementa sessao_versao (derruba sessões antigas). */
  atualizarSenha(usuarioId: number, senhaHash: string): Promise<void>;
  criarRedefinicao(usuarioId: number, tokenHash: string, expiraEm: Date): Promise<void>;
  buscarRedefinicao(tokenHash: string): Promise<{ id: number; usuarioId: number; expiraEm: Date; usadoEm: Date | null } | null>;
  /** Marca como usados todos os links pendentes do usuário. */
  encerrarRedefinicoes(usuarioId: number, quando: Date): Promise<void>;
}

export interface Hasher {
  hash(senha: string): Promise<string>;
  comparar(senha: string, hash: string): Promise<boolean>;
}

/** Entrega do link de redefinição. Sem provedor de e-mail configurado, apenas registra em log. */
export interface Notificador {
  enviarRedefinicaoSenha(destino: { email: string; nome: string }, link: string): Promise<void>;
}

export interface ContextoRequisicao {
  correlacaoId: string;
}

export class AuthService {
  private hashFicticio: Promise<string> | null = null;

  constructor(
    private readonly repo: AuthRepository,
    private readonly hasher: Hasher,
    private readonly notificador: Notificador,
    private readonly auditoria: RegistroAuditoria,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  async cadastrar(dados: CadastroDados, ctx: ContextoRequisicao) {
    const problemas = validarSenha(dados.senha, dados.email);
    if (problemas.length > 0) throw regraNegocio('A senha não atende aos requisitos.', problemas);

    if (await this.repo.buscarPorEmail(dados.email)) {
      throw conflito('Já existe uma conta com este e-mail. Entre ou use "Esqueci minha senha".');
    }

    const docente = dados.tipo === 'docente';
    const id = await this.repo.inserir({
      nome: dados.nome,
      email: dados.email,
      senhaHash: await this.hasher.hash(dados.senha),
      papel: docente ? 'professor' : 'estudante',
      telefone: normalizarTelefone(dados.telefone),
      areaAtuacao: docente ? dados.areaAtuacao : null,
      situacaoDocente: docente ? 'pendente' : 'nao_se_aplica',
      termosVersao: VERSAO_TERMOS,
      termosAceitosEm: this.relogio(),
    });

    await this.auditoria.registrar({
      usuarioId: id,
      acao: 'usuario.cadastrar',
      recursoTipo: 'usuario',
      recursoId: id,
      resultado: 'sucesso',
      correlacaoId: ctx.correlacaoId,
      detalhes: { tipo: dados.tipo, termosVersao: VERSAO_TERMOS },
    });

    const usuario = await this.repo.buscarPorId(id);
    if (!usuario) throw new Error('Usuário recém-criado não encontrado.');
    return usuario;
  }

  async entrar(email: string, senha: string, ctx: ContextoRequisicao) {
    const usuario = await this.repo.buscarPorEmail(email);
    // Compara mesmo sem usuário, para não revelar quais e-mails existem pelo tempo de resposta.
    this.hashFicticio ??= this.hasher.hash('farol-senha-ficticia-nunca-usada');
    const valida = await this.hasher.comparar(senha, usuario?.senhaHash ?? (await this.hashFicticio));

    if (!usuario || !usuario.ativo || !valida) {
      await this.auditoria.registrar({
        usuarioId: usuario?.id ?? null,
        acao: 'auth.login',
        recursoTipo: 'sessao',
        resultado: 'falha',
        correlacaoId: ctx.correlacaoId,
        detalhes: { motivo: !usuario ? 'usuario_inexistente' : !usuario.ativo ? 'usuario_inativo' : 'senha_incorreta' },
      });
      throw naoAutenticado('E-mail ou senha incorretos.');
    }

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'auth.login',
      recursoTipo: 'sessao',
      resultado: 'sucesso',
      correlacaoId: ctx.correlacaoId,
    });
    return usuario;
  }

  /**
   * Sempre conclui sem erro, exista ou não a conta, para não permitir
   * descobrir e-mails cadastrados. O link vale 30 minutos e uso único.
   */
  async solicitarRedefinicao(email: string, urlBase: string, ctx: ContextoRequisicao) {
    const usuario = await this.repo.buscarPorEmail(email);
    if (!usuario || !usuario.ativo) {
      await this.auditoria.registrar({
        usuarioId: null,
        acao: 'auth.solicitar_redefinicao',
        recursoTipo: 'sessao',
        resultado: 'falha',
        correlacaoId: ctx.correlacaoId,
        detalhes: { motivo: 'conta_inexistente_ou_inativa' },
      });
      return;
    }

    const agora = this.relogio();
    await this.repo.encerrarRedefinicoes(usuario.id, agora);
    const { token, hash } = gerarTokenRedefinicao();
    await this.repo.criarRedefinicao(usuario.id, hash, new Date(agora.getTime() + VALIDADE_REDEFINICAO_MS));
    await this.notificador.enviarRedefinicaoSenha(
      { email: usuario.email, nome: usuario.nome },
      `${urlBase.replace(/\/$/, '')}/redefinir-senha?token=${encodeURIComponent(token)}`,
    );
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'auth.solicitar_redefinicao',
      recursoTipo: 'sessao',
      resultado: 'sucesso',
      correlacaoId: ctx.correlacaoId,
    });
  }

  async redefinirSenha(token: string, novaSenha: string, ctx: ContextoRequisicao) {
    const pedido = await this.repo.buscarRedefinicao(hashToken(token));
    const agora = this.relogio();
    if (!pedido || pedido.usadoEm || pedido.expiraEm.getTime() <= agora.getTime()) {
      throw regraNegocio('Este link de redefinição é inválido ou expirou. Solicite um novo.');
    }
    const usuario = await this.repo.buscarPorId(pedido.usuarioId);
    if (!usuario || !usuario.ativo) throw regraNegocio('Este link de redefinição é inválido ou expirou. Solicite um novo.');

    const problemas = validarSenha(novaSenha, usuario.email);
    if (problemas.length > 0) throw regraNegocio('A senha não atende aos requisitos.', problemas);

    await this.repo.atualizarSenha(usuario.id, await this.hasher.hash(novaSenha));
    await this.repo.encerrarRedefinicoes(usuario.id, agora);
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'auth.redefinir_senha',
      recursoTipo: 'usuario',
      recursoId: usuario.id,
      resultado: 'sucesso',
      correlacaoId: ctx.correlacaoId,
    });
  }
}
