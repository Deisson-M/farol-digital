import type { Curso, CursoDetalhe, MinhaMatricula, Nivel, Pagina } from '../types/api';
import { api } from './api';

export interface FiltrosCursos {
  busca?: string;
  nivel?: Nivel;
  preco?: 'gratuito' | 'pago';
  destaque?: boolean;
  pagina?: number;
  limite?: number;
}

export const cursosService = {
  async listar(filtros: FiltrosCursos = {}) {
    const params = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '' && v !== false),
    );
    const { data } = await api.get<Pagina<Curso>>('/cursos', { params });
    return data;
  },
  async detalhar(id: number) {
    const { data } = await api.get<CursoDetalhe>(`/cursos/${id}`);
    return data;
  },
  async matricular(id: number) {
    const { data } = await api.post<{ cursoId: number; situacao: 'ativa' }>(`/cursos/${id}/matriculas`);
    return data;
  },
  async minhasMatriculas() {
    const { data } = await api.get<{ itens: MinhaMatricula[] }>('/matriculas/minhas');
    return data.itens;
  },
};
