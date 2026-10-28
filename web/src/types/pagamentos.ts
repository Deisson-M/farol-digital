export type MetodoPagamento = 'cartao_credito' | 'cartao_debito' | 'pix' | 'boleto' | 'paypal' | 'carteira_digital';
export type SituacaoPagamento = 'pendente' | 'aprovado' | 'recusado' | 'expirado' | 'cancelado';
export type SituacaoPedido = 'aguardando_pagamento' | 'pago' | 'cancelado' | 'expirado';
export type Bandeira = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'outra';

export interface Pagamento {
  codigo: string;
  metodo: MetodoPagamento;
  situacao: SituacaoPagamento;
  valorCentavos: number;
  parcelas: number;
  cartao: { bandeira: string; final: string } | null;
  pixCopiaCola: string | null;
  boletoLinhaDigitavel: string | null;
  boletoVencimento: string | null;
  urlAprovacao: string | null;
  expiraEm: string | null;
  motivoRecusa: string | null;
  confirmadoEm: string | null;
  simulado: boolean;
}

export interface Pedido {
  codigo: string;
  situacao: SituacaoPedido;
  valorCentavos: number;
  criadoEm: string;
  pagoEm: string | null;
  curso: { id: number; titulo: string };
  metodos: Array<{ metodo: MetodoPagamento; rotulo: string }>;
  parcelamento: Array<{ parcelas: number; valorParcelaCentavos: number }>;
  pagamentoAtual: Pagamento | null;
  /** Provedor simulado: nenhuma cobrança real. */
  ambienteDemonstracao: boolean;
}

export type DadosPagamento =
  | { metodo: 'cartao_credito' | 'cartao_debito'; parcelas: number; tokenPagamento: string; cartao: { bandeira: Bandeira; final: string } }
  | { metodo: 'carteira_digital'; tokenPagamento: string }
  | { metodo: 'pix' | 'paypal' }
  | { metodo: 'boleto'; pagador: { nome: string; cpf: string } };
