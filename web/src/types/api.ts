export type Papel = 'estudante' | 'professor' | 'coordenador' | 'admin';
export type Nivel = 'iniciante' | 'intermediario' | 'avancado';
export type SituacaoDocente = 'nao_se_aplica' | 'pendente' | 'aprovado' | 'recusado';
export type SituacaoMatricula = 'ativa' | 'concluida' | 'cancelada' | 'trancada';

/** Formato de erro padronizado retornado pela API. */
export interface ErroApi {
  status: number;
  codigo: string;
  mensagem: string;
  detalhes?: unknown;
  correlacaoId?: string;
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

/** Mantido por compatibilidade com o editor de trilhas. */
export type CursoResumo = Curso;

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

export interface DadosCadastro {
  tipo: 'aluno' | 'docente';
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  areaAtuacao?: string;
  aceiteTermos: boolean;
}

export interface DocentePendente {
  id: number;
  nome: string;
  email: string;
  areaAtuacao: string | null;
  situacaoDocente: SituacaoDocente;
  criadoEm: string;
}
