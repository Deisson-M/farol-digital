import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { MetodoPagamento, SituacaoPagamento } from '../../db/schema/enums.js';

export const PARCELAS_MAXIMAS = 6;
/** Valor mínimo de cada parcela no cartão de crédito: R$ 10,00. */
export const PARCELA_MINIMA_CENTAVOS = 1000;
export const VALIDADE_PIX_MS = 30 * 60 * 1000;
export const DIAS_UTEIS_BOLETO = 3;

export const ROTULO_METODO: Record<MetodoPagamento, string> = {
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  pix: 'Pix',
  boleto: 'Boleto bancário',
  paypal: 'PayPal',
  carteira_digital: 'Google Pay / Apple Pay',
};

/** Parcelamento sem juros: até 6x, respeitando a parcela mínima. */
export function opcoesParcelamento(valorCentavos: number) {
  const maximo = Math.max(1, Math.min(PARCELAS_MAXIMAS, Math.floor(valorCentavos / PARCELA_MINIMA_CENTAVOS)));
  return Array.from({ length: maximo }, (_, i) => {
    const parcelas = i + 1;
    return { parcelas, valorParcelaCentavos: Math.ceil(valorCentavos / parcelas) };
  });
}

export function validarParcelas(metodo: MetodoPagamento, parcelas: number, valorCentavos: number): string | null {
  if (!Number.isInteger(parcelas) || parcelas < 1) return 'Número de parcelas inválido.';
  if (metodo !== 'cartao_credito') return parcelas === 1 ? null : 'Somente o cartão de crédito permite parcelar.';
  const maximo = opcoesParcelamento(valorCentavos).length;
  return parcelas <= maximo ? null : `Para este valor, o parcelamento é de no máximo ${maximo}x.`;
}

/** Valida CPF pelos dígitos verificadores. */
export function cpfValido(valor: string): boolean {
  const cpf = valor.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

/** Guarda somente o miolo do CPF: ***.456.789-** */
export function mascararCpf(valor: string): string {
  const cpf = valor.replace(/\D/g, '');
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

/** Próxima data útil (seg–sex) após somar `dias` úteis. Não considera feriados. */
export function somarDiasUteis(inicio: Date, dias: number): Date {
  const data = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate()));
  let restantes = dias;
  while (restantes > 0) {
    data.setUTCDate(data.getUTCDate() + 1);
    const diaSemana = data.getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) restantes--;
  }
  return data;
}

const TRANSICOES: Record<SituacaoPagamento, SituacaoPagamento[]> = {
  pendente: ['aprovado', 'recusado', 'expirado', 'cancelado'],
  aprovado: [],
  recusado: [],
  expirado: [],
  cancelado: [],
};

export function transicaoPermitida(de: SituacaoPagamento, para: SituacaoPagamento) {
  return TRANSICOES[de].includes(para);
}

// ---------- Simulação (somente desenvolvimento) ----------

/** Código "copia e cola" de demonstração. NÃO é um BR Code válido. */
export function gerarPixSimulado(codigoPagamento: string, valorCentavos: number) {
  const valor = (valorCentavos / 100).toFixed(2);
  return `SIMULADO-PIX|FAROL DIGITAL|${valor}|${codigoPagamento.replace(/-/g, '').toUpperCase()}`;
}

/** Linha digitável de demonstração com 47 dígitos (formato visual de boleto). */
export function gerarLinhaDigitavelSimulada(valorCentavos: number) {
  const aleatorio = Array.from({ length: 33 }, () => randomInt(0, 10)).join('');
  const valor = String(valorCentavos).padStart(10, '0');
  const d = `0009${aleatorio}${valor}`.slice(0, 47);
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
}

// ---------- Webhook ----------

export function assinarWebhook(corpo: string, segredo: string) {
  return createHmac('sha256', segredo).update(corpo).digest('hex');
}

export function assinaturaValida(corpo: string, assinatura: string | undefined, segredo: string) {
  if (!assinatura || !/^[0-9a-f]{64}$/i.test(assinatura)) return false;
  const esperada = Buffer.from(assinarWebhook(corpo, segredo), 'hex');
  const recebida = Buffer.from(assinatura, 'hex');
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}
