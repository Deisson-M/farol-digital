import { randomUUID } from 'node:crypto';
import type { MetodoPagamento } from '../../db/schema/enums.js';
import {
  DIAS_UTEIS_BOLETO,
  gerarLinhaDigitavelSimulada,
  gerarPixSimulado,
  somarDiasUteis,
  VALIDADE_PIX_MS,
} from './pagamentos.regras.js';

export interface EntradaCobranca {
  codigoPagamento: string;
  metodo: MetodoPagamento;
  valorCentavos: number;
  parcelas: number;
  descricao: string;
  /** Token gerado pelo SDK do gateway no navegador — nunca o número do cartão. */
  tokenPagamento?: string;
  cartaoFinal?: string;
  pagador?: { nome: string; cpf: string };
}

export interface ResultadoCobranca {
  situacao: 'aprovado' | 'recusado' | 'pendente';
  referencia: string;
  motivoRecusa?: string;
  pixCopiaCola?: string;
  boletoLinhaDigitavel?: string;
  boletoVencimento?: string;
  urlAprovacao?: string;
  expiraEm?: Date;
}

/**
 * Contrato para gateways de pagamento (Mercado Pago, Pagar.me, Stripe…).
 * Para integrar um gateway real, implemente esta interface e selecione-o em
 * PAGAMENTOS_PROVEDOR; a confirmação assíncrona chega pelo webhook.
 */
export interface ProvedorPagamento {
  readonly nome: string;
  criarCobranca(entrada: EntradaCobranca): Promise<ResultadoCobranca>;
}

/**
 * Provedor de DEMONSTRAÇÃO: não movimenta dinheiro. Regras para testes:
 * - Cartão terminado em 0002 → recusado; qualquer outro → aprovado.
 * - Pix, boleto e PayPal ficam pendentes até a confirmação (webhook ou botão de simulação).
 */
export class ProvedorSimulado implements ProvedorPagamento {
  readonly nome = 'simulado';

  constructor(
    private readonly urlApp: string,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  async criarCobranca(e: EntradaCobranca): Promise<ResultadoCobranca> {
    const referencia = `sim_${randomUUID()}`;
    const agora = this.relogio();

    switch (e.metodo) {
      case 'cartao_credito':
      case 'cartao_debito':
        if (!e.tokenPagamento) return { situacao: 'recusado', referencia, motivoRecusa: 'Dados do cartão ausentes.' };
        if (e.cartaoFinal === '0002') {
          return { situacao: 'recusado', referencia, motivoRecusa: 'Pagamento recusado pelo emissor do cartão.' };
        }
        return { situacao: 'aprovado', referencia };
      case 'carteira_digital':
        return e.tokenPagamento
          ? { situacao: 'aprovado', referencia }
          : { situacao: 'recusado', referencia, motivoRecusa: 'Autorização da carteira digital ausente.' };
      case 'pix':
        return {
          situacao: 'pendente',
          referencia,
          pixCopiaCola: gerarPixSimulado(e.codigoPagamento, e.valorCentavos),
          expiraEm: new Date(agora.getTime() + VALIDADE_PIX_MS),
        };
      case 'boleto': {
        const vencimento = somarDiasUteis(agora, DIAS_UTEIS_BOLETO);
        return {
          situacao: 'pendente',
          referencia,
          boletoLinhaDigitavel: gerarLinhaDigitavelSimulada(e.valorCentavos),
          boletoVencimento: vencimento.toISOString().slice(0, 10),
          // Vale até o fim do dia do vencimento (horário de Brasília ≈ 03:00 UTC do dia seguinte).
          expiraEm: new Date(vencimento.getTime() + 27 * 60 * 60 * 1000),
        };
      }
      case 'paypal':
        return {
          situacao: 'pendente',
          referencia,
          urlAprovacao: `${this.urlApp.replace(/\/$/, '')}/pagamento/paypal-simulado/${e.codigoPagamento}`,
          expiraEm: new Date(agora.getTime() + 3 * 60 * 60 * 1000),
        };
    }
  }
}
