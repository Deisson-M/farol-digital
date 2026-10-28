import type { Nivel } from './api';

export type CriterioConclusao = 'todos_obrigatorios' | 'percentual_minimo';
export type SituacaoTrilha = 'nao_iniciada' | 'em_andamento' | 'concluida';
export type StatusCurso = 'concluido' | 'em_andamento' | 'disponivel' | 'bloqueado';

export interface TrilhaResumo {
  id: number;
  slug: string;
  titulo: string;
  descricao: string;
  tema: string;
  nivel: Nivel;
  publicada: boolean;
  totalCursos: number;
  cargaHorariaTotalMinutos: number;
}

export interface CursoDaTrilha {
  cursoId: number;
  titulo: string;
  ordem: number;
  obrigatorio: boolean;
  requerAnteriores: boolean;
  cargaHorariaMinutos: number;
}

export interface TrilhaDetalhe extends TrilhaResumo {
  objetivos: string[];
  criterioConclusao: CriterioConclusao;
  percentualMinimo: number;
  criterio: string;
  cursos: CursoDaTrilha[];
}

export interface ProximaEtapa {
  cursoId: number;
  titulo: string;
  motivo: 'continuar' | 'iniciar';
}

export interface CursoComStatus extends CursoDaTrilha {
  status: StatusCurso;
  progressoPercentual: number;
  pendencias: string[];
}

export interface ProgressoTrilha {
  trilhaId: number;
  situacao: SituacaoTrilha;
  percentual: number;
  cursosConcluidos: number;
  cursosConsiderados: number;
  criterio: string;
  cargaHorariaTotalMinutos: number;
  cargaHorariaRestanteMinutos: number;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  proximaEtapa: ProximaEtapa | null;
  cursos: CursoComStatus[];
}

export interface MinhaTrilha extends TrilhaResumo {
  progresso: Omit<ProgressoTrilha, 'cursos'>;
}

export interface FiltrosTrilhas {
  nivel?: Nivel;
  tema?: string;
  busca?: string;
  pagina?: number;
  limite?: number;
}

export interface DadosTrilha {
  titulo: string;
  slug?: string;
  descricao: string;
  tema: string;
  nivel: Nivel;
  objetivos: string[];
  criterioConclusao: CriterioConclusao;
  percentualMinimo: number;
}

export interface ItemSequencia {
  cursoId: number;
  obrigatorio: boolean;
  requerAnteriores: boolean;
}
