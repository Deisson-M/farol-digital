import type { Nivel, SituacaoMatricula } from '../../db/schema/enums.js';
import { conflito, naoEncontrado, regraNegocio } from '../../lib/erros.js';
import type { RegistroAuditoria } from '../auditoria/auditoria.service.js';

export interface CursoRegistro {
  id: number;
  slug: string;
  titulo: string;
  descricao: string | null;
  nivel: Nivel;
  cargaHorariaMinutos: number;
  precoCentavos: number;
  destaque: boolean;
  publicado: boolean;
}

export interface FiltrosCursos {
  busca?: string;
  nivel?: Nivel;
  preco?: 'gratuito' | 'pago';
  destaque?: boolean;
  pagina: number;
  limite: number;
}

export interface MatriculaComCurso {
  cursoId: number;
  titulo: string;
  nivel: Nivel;
  cargaHorariaMinutos: number;
  situacao: SituacaoMatricula;
  progressoPercentual: number;
  iniciadoEm: Date;
  concluidoEm: Date | null;
}

export interface CursosRepository {
  listar(filtros: FiltrosCursos & { incluirRascunhos: boolean }): Promise<{ itens: CursoRegistro[]; total: number }>;
  buscarPorId(id: number): Promise<CursoRegistro | null>;
  situacaoMatricula(usuarioId: number, cursoId: number): Promise<SituacaoMatricula | null>;
  /** Insere matrícula ativa ou reativa uma cancelada/trancada. */
  matricular(usuarioId: number, cursoId: number): Promise<void>;
  listarMatriculas(usuarioId: number): Promise<MatriculaComCurso[]>;
}

export class CursosService {
  constructor(
    private readonly repo: CursosRepository,
    private readonly auditoria: RegistroAuditoria,
  ) {}

  async listar(filtros: FiltrosCursos, incluirRascunhos: boolean) {
    const { itens, total } = await this.repo.listar({ ...filtros, incluirRascunhos });
    return { itens: itens.map(visao), total, pagina: filtros.pagina, limite: filtros.limite };
  }

  async detalhar(id: number, usuarioId: number | null, incluirRascunhos: boolean) {
    const curso = await this.repo.buscarPorId(id);
    if (!curso || (!curso.publicado && !incluirRascunhos)) throw naoEncontrado('Curso');
    const situacao = usuarioId ? await this.repo.situacaoMatricula(usuarioId, id) : null;
    return { ...visao(curso), matricula: situacao === 'cancelada' ? null : situacao };
  }

  /** Matrícula direta, somente para cursos gratuitos. Cursos pagos passam pelo pedido. */
  async matricularGratuito(usuarioId: number, cursoId: number, correlacaoId: string) {
    const curso = await this.repo.buscarPorId(cursoId);
    if (!curso || !curso.publicado) throw naoEncontrado('Curso');
    if (curso.precoCentavos > 0) {
      throw regraNegocio('Este curso é pago. Conclua a compra para liberar o acesso.', { precoCentavos: curso.precoCentavos });
    }
    const atual = await this.repo.situacaoMatricula(usuarioId, cursoId);
    if (atual === 'ativa' || atual === 'concluida') throw conflito('Você já está matriculado neste curso.');

    await this.repo.matricular(usuarioId, cursoId);
    await this.auditoria.registrar({
      usuarioId,
      acao: 'matricula.criar',
      recursoTipo: 'curso',
      recursoId: cursoId,
      resultado: 'sucesso',
      correlacaoId,
      detalhes: { gratuito: true, reativacao: atual !== null },
    });
    return { cursoId, situacao: 'ativa' as const };
  }

  async minhasMatriculas(usuarioId: number) {
    const itens = await this.repo.listarMatriculas(usuarioId);
    return itens
      .filter((m) => m.situacao !== 'cancelada')
      .map((m) => ({
        ...m,
        iniciadoEm: m.iniciadoEm.toISOString(),
        concluidoEm: m.concluidoEm?.toISOString() ?? null,
      }));
  }
}

function visao(c: CursoRegistro) {
  return {
    id: c.id,
    slug: c.slug,
    titulo: c.titulo,
    descricao: c.descricao ?? '',
    nivel: c.nivel,
    cargaHorariaMinutos: c.cargaHorariaMinutos,
    precoCentavos: c.precoCentavos,
    gratuito: c.precoCentavos === 0,
    destaque: c.destaque,
    publicado: c.publicado,
  };
}
