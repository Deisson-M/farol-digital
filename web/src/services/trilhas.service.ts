import type { Pagina } from '../types/api';
import type {
  DadosTrilha,
  FiltrosTrilhas,
  ItemSequencia,
  MinhaTrilha,
  ProgressoTrilha,
  TrilhaDetalhe,
  TrilhaResumo,
} from '../types/trilhas';
import { api } from './api';

/** Remove filtros vazios para não enviar parâmetros como "busca=". */
const limpar = <T extends object>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;

export const trilhasService = {
  async listar(filtros: FiltrosTrilhas = {}) {
    const { data } = await api.get<Pagina<TrilhaResumo>>('/trilhas', { params: limpar(filtros) });
    return data;
  },
  async detalhar(id: number) {
    const { data } = await api.get<TrilhaDetalhe>(`/trilhas/${id}`);
    return data;
  },
  async minhas() {
    const { data } = await api.get<{ itens: MinhaTrilha[] }>('/trilhas/minhas');
    return data.itens;
  },
  async progresso(id: number) {
    const { data } = await api.get<ProgressoTrilha>(`/trilhas/${id}/progresso`);
    return data;
  },

  // ---------- gestão ----------
  async criar(dados: DadosTrilha) {
    const { data } = await api.post<TrilhaDetalhe>('/admin/trilhas', dados);
    return data;
  },
  async atualizar(id: number, dados: Partial<DadosTrilha> & { publicada?: boolean }) {
    const { data } = await api.patch<TrilhaDetalhe>(`/admin/trilhas/${id}`, dados);
    return data;
  },
  async definirCursos(id: number, cursos: ItemSequencia[]) {
    const { data } = await api.put<TrilhaDetalhe>(`/admin/trilhas/${id}/cursos`, { cursos });
    return data;
  },
};
