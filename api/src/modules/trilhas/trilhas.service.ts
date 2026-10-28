import type { CriterioConclusao, Nivel } from '../../db/schema/enums.js';
import { conflito, naoEncontrado, regraNegocio } from '../../lib/erros.js';
import type { RegistroAuditoria } from '../auditoria/auditoria.service.js';
import {
  calcularProgressoTrilha,
  consolidarSituacao,
  descreverCriterio,
  gerarSlug,
  normalizarSequencia,
  validarSequencia,
  type CursoDaTrilha,
  type ItemSequencia,
  type MatriculaResumo,
  type ProgressoPersistido,
  type ResultadoProgresso,
} from './trilhas.regras.js';
import type { AtualizarTrilhaDados, CriarTrilhaDados, FiltrosCatalogo } from './trilhas.schemas.js';

export interface TrilhaRegistro {
  id: number;
  slug: string;
  titulo: string;
  descricao: string;
  tema: string;
  nivel: Nivel;
  objetivos: string[];
  criterioConclusao: CriterioConclusao;
  percentualMinimo: number;
  publicada: boolean;
}

export interface TrilhaComTotais extends TrilhaRegistro {
  totalCursos: number;
  cargaHorariaTotalMinutos: number;
}

export interface ProgressoParaSalvar extends ProgressoPersistido {
  percentual: number;
  cursosConcluidos: number;
  cursosConsiderados: number;
}

/** Contrato de persistência; a implementação MySQL está em trilhas.repository.ts. */
export interface TrilhasRepository {
  listar(
    filtros: FiltrosCatalogo & { incluirRascunhos: boolean },
  ): Promise<{ itens: TrilhaComTotais[]; total: number }>;
  buscarPorId(id: number): Promise<TrilhaRegistro | null>;
  slugEmUso(slug: string, excetoId?: number): Promise<boolean>;
  listarCursos(trilhaId: number): Promise<CursoDaTrilha[]>;
  listarMatriculas(usuarioId: number, cursoIds: number[]): Promise<MatriculaResumo[]>;
  buscarProgresso(usuarioId: number, trilhaId: number): Promise<ProgressoPersistido | null>;
  salvarProgresso(usuarioId: number, trilhaId: number, dados: ProgressoParaSalvar): Promise<void>;
  /** Trilhas publicadas com progresso registrado ou com matrícula (não cancelada) em algum curso. */
  idsTrilhasDoUsuario(usuarioId: number): Promise<number[]>;
  cursosExistentes(ids: number[]): Promise<Set<number>>;
  inserir(dados: Omit<TrilhaRegistro, 'id'> & { criadoPor: number }): Promise<number>;
  atualizar(id: number, dados: Partial<Omit<TrilhaRegistro, 'id'>>): Promise<void>;
  substituirCursos(
    trilhaId: number,
    linhas: Array<ItemSequencia & { ordem: number }>,
  ): Promise<void>;
}

export interface ContextoAcao {
  usuarioId: number;
  correlacaoId: string;
}

const paraIso = (data: Date | null) => (data ? data.toISOString() : null);

export class TrilhasService {
  constructor(
    private readonly repo: TrilhasRepository,
    private readonly auditoria: RegistroAuditoria,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  async listar(filtros: FiltrosCatalogo, incluirRascunhos: boolean) {
    const { itens, total } = await this.repo.listar({ ...filtros, incluirRascunhos });
    return { itens: itens.map((t) => this.resumo(t)), total, pagina: filtros.pagina, limite: filtros.limite };
  }

  async detalhar(id: number, incluirRascunhos: boolean) {
    const trilha = await this.obterVisivel(id, incluirRascunhos);
    const cursos = await this.repo.listarCursos(id);
    return {
      ...this.resumo({
        ...trilha,
        totalCursos: cursos.length,
        cargaHorariaTotalMinutos: cursos.reduce((soma, c) => soma + c.cargaHorariaMinutos, 0),
      }),
      objetivos: trilha.objetivos,
      criterioConclusao: trilha.criterioConclusao,
      percentualMinimo: trilha.percentualMinimo,
      criterio: descreverCriterio(trilha),
      cursos: [...cursos].sort((a, b) => a.ordem - b.ordem),
    };
  }

  /** Recalcula a partir das matrículas, persiste a fotografia e retorna o detalhamento. */
  async progresso(usuarioId: number, trilhaId: number) {
    const trilha = await this.obterVisivel(trilhaId, false);
    return this.recalcular(usuarioId, trilha);
  }

  async minhas(usuarioId: number) {
    const ids = await this.repo.idsTrilhasDoUsuario(usuarioId);
    const resultado = [];
    for (const id of ids) {
      const trilha = await this.repo.buscarPorId(id);
      if (!trilha || !trilha.publicada) continue;
      const progresso = await this.recalcular(usuarioId, trilha);
      const { cursos, ...semCursos } = progresso;
      resultado.push({
        ...this.resumo({
          ...trilha,
          totalCursos: cursos.length,
          cargaHorariaTotalMinutos: progresso.cargaHorariaTotalMinutos,
        }),
        progresso: semCursos,
      });
    }
    const peso = { em_andamento: 0, nao_iniciada: 1, concluida: 2 } as const;
    return resultado.sort(
      (a, b) => peso[a.progresso.situacao] - peso[b.progresso.situacao] || b.progresso.percentual - a.progresso.percentual,
    );
  }

  async criar(dados: CriarTrilhaDados, ctx: ContextoAcao) {
    const slug = dados.slug ?? gerarSlug(dados.titulo);
    if (!slug) throw regraNegocio('Não foi possível gerar um identificador (slug) a partir do título.');
    if (await this.repo.slugEmUso(slug)) throw conflito(`O slug "${slug}" já está em uso por outra trilha.`);

    const id = await this.repo.inserir({
      slug,
      titulo: dados.titulo,
      descricao: dados.descricao,
      tema: dados.tema,
      nivel: dados.nivel,
      objetivos: dados.objetivos,
      criterioConclusao: dados.criterioConclusao,
      percentualMinimo: dados.percentualMinimo,
      // Toda trilha nasce como rascunho; a publicação exige cursos associados.
      publicada: false,
      criadoPor: ctx.usuarioId,
    });

    await this.auditar(ctx, 'trilha.criar', id, { slug, titulo: dados.titulo });
    return this.detalhar(id, true);
  }

  async atualizar(id: number, dados: AtualizarTrilhaDados, ctx: ContextoAcao) {
    const atual = await this.repo.buscarPorId(id);
    if (!atual) throw naoEncontrado('Trilha');

    if (dados.slug && dados.slug !== atual.slug && (await this.repo.slugEmUso(dados.slug, id))) {
      throw conflito(`O slug "${dados.slug}" já está em uso por outra trilha.`);
    }

    if (dados.publicada === true && !atual.publicada) {
      const cursos = await this.repo.listarCursos(id);
      if (cursos.length === 0) throw regraNegocio('Associe pelo menos um curso antes de publicar a trilha.');
    }

    await this.repo.atualizar(id, dados);

    const campos = Object.keys(dados);
    const acao =
      dados.publicada === true && !atual.publicada
        ? 'trilha.publicar'
        : dados.publicada === false && atual.publicada
          ? 'trilha.despublicar'
          : 'trilha.atualizar';
    await this.auditar(ctx, acao, id, { campos });

    return this.detalhar(id, true);
  }

  async definirCursos(id: number, itens: ItemSequencia[], ctx: ContextoAcao) {
    const trilha = await this.repo.buscarPorId(id);
    if (!trilha) throw naoEncontrado('Trilha');

    if (trilha.publicada && itens.length === 0) {
      throw regraNegocio('Uma trilha publicada não pode ficar sem cursos. Despublique-a antes.');
    }

    const existentes = await this.repo.cursosExistentes(itens.map((i) => i.cursoId));
    const problemas = validarSequencia(itens, existentes);
    if (problemas.length > 0) throw regraNegocio('A sequência de cursos é inválida.', problemas);

    const linhas = normalizarSequencia(itens);
    await this.repo.substituirCursos(id, linhas);
    await this.auditar(ctx, 'trilha.definir_cursos', id, {
      cursos: linhas.map((l) => ({ cursoId: l.cursoId, ordem: l.ordem, obrigatorio: l.obrigatorio })),
    });

    return this.detalhar(id, true);
  }

  // ---------- auxiliares ----------

  private async obterVisivel(id: number, incluirRascunhos: boolean) {
    const trilha = await this.repo.buscarPorId(id);
    // Rascunhos são tratados como inexistentes para quem não pode vê-los.
    if (!trilha || (!trilha.publicada && !incluirRascunhos)) throw naoEncontrado('Trilha');
    return trilha;
  }

  private async recalcular(usuarioId: number, trilha: TrilhaRegistro) {
    const cursos = await this.repo.listarCursos(trilha.id);
    const matriculas = await this.repo.listarMatriculas(
      usuarioId,
      cursos.map((c) => c.cursoId),
    );
    const calculado: ResultadoProgresso = calcularProgressoTrilha(trilha, cursos, matriculas);
    const anterior = await this.repo.buscarProgresso(usuarioId, trilha.id);
    const consolidado = consolidarSituacao(anterior, calculado, this.relogio());

    await this.repo.salvarProgresso(usuarioId, trilha.id, {
      ...consolidado,
      percentual: calculado.percentual,
      cursosConcluidos: calculado.cursosConcluidos,
      cursosConsiderados: calculado.cursosConsiderados,
    });

    return {
      trilhaId: trilha.id,
      situacao: consolidado.situacao,
      percentual: calculado.percentual,
      cursosConcluidos: calculado.cursosConcluidos,
      cursosConsiderados: calculado.cursosConsiderados,
      criterio: calculado.criterio,
      cargaHorariaTotalMinutos: calculado.cargaHorariaTotalMinutos,
      cargaHorariaRestanteMinutos: calculado.cargaHorariaRestanteMinutos,
      iniciadaEm: paraIso(consolidado.iniciadaEm),
      concluidaEm: paraIso(consolidado.concluidaEm),
      proximaEtapa: calculado.proximaEtapa,
      cursos: calculado.cursos,
    };
  }

  private resumo(t: TrilhaComTotais) {
    return {
      id: t.id,
      slug: t.slug,
      titulo: t.titulo,
      descricao: t.descricao,
      tema: t.tema,
      nivel: t.nivel,
      publicada: t.publicada,
      totalCursos: t.totalCursos,
      cargaHorariaTotalMinutos: t.cargaHorariaTotalMinutos,
    };
  }

  private auditar(ctx: ContextoAcao, acao: string, trilhaId: number, detalhes: Record<string, unknown>) {
    return this.auditoria.registrar({
      usuarioId: ctx.usuarioId,
      acao,
      recursoTipo: 'trilha',
      recursoId: trilhaId,
      resultado: 'sucesso',
      correlacaoId: ctx.correlacaoId,
      detalhes,
    });
  }
}
