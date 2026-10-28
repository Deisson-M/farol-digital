/** Tipos das respostas da API do Farol Digital (os mesmos usados no site). */
export type Papel = 'estudante' | 'professor' | 'coordenador' | 'admin';
export type Nivel = 'iniciante' | 'intermediario' | 'avancado';
export type SituacaoDocente = 'nao_se_aplica' | 'pendente' | 'aprovado' | 'recusado';
export type SituacaoMatricula = 'ativa' | 'concluida' | 'cancelada' | 'trancada';
export type SituacaoTrilha = 'nao_iniciada' | 'em_andamento' | 'concluida';
export type StatusCurso = 'concluido' | 'em_andamento' | 'disponivel' | 'bloqueado';

export interface ErroApi {
  status: number;
  codigo: string;
  mensagem: string;
  detalhes?: unknown;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  limite: number;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  situacaoDocente: SituacaoDocente;
}

export interface Curso {
  id: number;
  slug: string;
  titulo: string;
  descricao: string;
  nivel: Nivel;
  cargaHorariaMinutos: number;
  precoCentavos: number;
  gratuito: boolean;
  destaque: boolean;
  publicado: boolean;
}

export interface CursoDetalhe extends Curso {
  matricula: SituacaoMatricula | null;
}

export interface MinhaMatricula {
  cursoId: number;
  titulo: string;
  nivel: Nivel;
  cargaHorariaMinutos: number;
  situacao: SituacaoMatricula;
  progressoPercentual: number;
  iniciadoEm: string;
  concluidoEm: string | null;
}

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
  criterio: string;
  cursos: CursoDaTrilha[];
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
  proximaEtapa: { cursoId: number; titulo: string; motivo: 'continuar' | 'iniciar' } | null;
  cursos: CursoComStatus[];
}

export interface MinhaTrilha extends TrilhaResumo {
  progresso: Omit<ProgressoTrilha, 'cursos'>;
}

export interface DadosCadastro {
  /** "docente" é o valor técnico da API para o perfil de professor. */
  tipo: 'aluno' | 'docente';
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  areaAtuacao?: string;
  aceiteTermos: boolean;
}
