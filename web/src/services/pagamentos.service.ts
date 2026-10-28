import type { DadosPagamento, Pagamento, Pedido } from '../types/pagamentos';
import { api } from './api';

/** Chave aleatória por tentativa de pagamento: reenvios da mesma tentativa não cobram duas vezes. */
export function novaChaveIdempotencia() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const pagamentosService = {
  async criarPedido(cursoId: number) {
    const { data } = await api.post<Pedido>('/pedidos', { cursoId });
    return data;
  },
  async obterPedido(codigo: string) {
    const { data } = await api.get<Pedido>(`/pedidos/${codigo}`);
    return data;
  },
  async pagar(codigoPedido: string, dados: DadosPagamento, chaveIdempotencia: string) {
    const { data } = await api.post<Pagamento>(`/pedidos/${codigoPedido}/pagamentos`, dados, {
      headers: { 'Idempotency-Key': chaveIdempotencia },
    });
    return data;
  },
  async obterPagamento(codigo: string) {
    const { data } = await api.get<Pagamento>(`/pagamentos/${codigo}`);
    return data;
  },
  async cancelar(codigo: string) {
    const { data } = await api.post<Pagamento>(`/pagamentos/${codigo}/cancelar`);
    return data;
  },
  /** Somente ambiente de demonstração (provedor simulado). */
  async simularConfirmacao(codigo: string, resultado: 'aprovado' | 'recusado' = 'aprovado') {
    const { data } = await api.post<Pagamento>(`/pagamentos/${codigo}/simular-confirmacao`, { resultado });
    return data;
  },
};
