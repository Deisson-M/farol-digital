import { api } from './api';
import type {
  Curso,
  CursoDetalhe,
  DadosCadastro,
  MinhaMatricula,
  MinhaTrilha,
  Nivel,
  Pagina,
  ProgressoTrilha,
  TrilhaDetalhe,
  TrilhaResumo,
  Usuario,
} from './tipos';

export interface FiltrosCursos {
  busca?: string;
  nivel?: Nivel;
  preco?: 'gratuito' | 'pago';
  destaque?: boolean;
  pagina?: number;
  limite?: number;
}

export const authServico = {
  entrar: (email: string, senha: string) => api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, senha }),
  cadastrar(dados: DadosCadastro) {
    const corpo: DadosCadastro = { ...dados, telefone: dados.telefone?.trim() || undefined };
    // A API não aceita "areaAtuacao" no cadastro de aluno.
    if (dados.tipo === 'aluno') delete corpo.areaAtuacao;
    return api.post<{ token: string; usuario: Usuario }>('/auth/cadastro', corpo);
  },
  eu: () => api.get<Usuario>('/auth/me'),
  sair: () => api.post<null>('/auth/logout'),
  esqueciSenha: (email: string) => api.post<{ mensagem: string }>('/auth/esqueci-senha', { email }),
};

export const cursosServico = {
  listar: (filtros: FiltrosCursos = {}) => api.get<Pagina<Curso>>('/cursos', { ...filtros }),
  detalhar: (id: number) => api.get<CursoDetalhe>(`/cursos/${id}`),
  matricular: (id: number) => api.post<{ cursoId: number; situacao: 'ativa' }>(`/cursos/${id}/matriculas`),
  minhasMatriculas: async () => (await api.get<{ itens: MinhaMatricula[] }>('/matriculas/minhas')).itens,
};

export const trilhasServico = {
  listar: (filtros: { nivel?: Nivel; busca?: string; pagina?: number; limite?: number } = {}) =>
    api.get<Pagina<TrilhaResumo>>('/trilhas', { ...filtros }),
  detalhar: (id: number) => api.get<TrilhaDetalhe>(`/trilhas/${id}`),
  progresso: (id: number) => api.get<ProgressoTrilha>(`/trilhas/${id}/progresso`),
  minhas: async () => (await api.get<{ itens: MinhaTrilha[] }>('/trilhas/minhas')).itens,
};
