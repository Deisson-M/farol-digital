import type { Bandeira } from '../types/pagamentos';

/** Identifica a bandeira pelos primeiros dígitos (BIN). */
export function detectarBandeira(numero: string): Bandeira {
  const n = numero.replace(/\D/g, '');
  if (/^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7]\d|9\d{3})|627780|63(6297|6368)|65(0(0(3[1-3]|[4-5]\d)|4(0[5-9]|[1-3]\d|8[5-9]|9\d)|5([0-2]\d|3[0-8]|4[1-9]|[5-8]\d|9[0-8])|7(0\d|1[0-8]|2[0-7])|9(0[1-9]|[1-6]\d|7[0-8]))|16(5[2-9]|[6-7]\d)|50(0\d|1\d|2[0-1])))/.test(n)) return 'elo';
  if (/^(606282|3841)/.test(n)) return 'hipercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return 'mastercard';
  if (/^4/.test(n)) return 'visa';
  return 'outra';
}

export const ROTULO_BANDEIRA: Record<Bandeira, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  outra: 'Cartão',
};

/** Algoritmo de Luhn: detecta erros de digitação no número do cartão. */
export function luhnValido(numero: string): boolean {
  const n = numero.replace(/\D/g, '');
  if (n.length < 13 || n.length > 19) return false;
  let soma = 0;
  let dobrar = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (dobrar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

/** "4242424242424242" → "4242 4242 4242 4242" (Amex: 4-6-5). */
export function formatarNumeroCartao(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 19);
  if (/^3[47]/.test(n)) return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(' ');
  return n.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatarValidade(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
}

/** Validade no formato MM/AA, não vencida. */
export function validadeOk(valor: string, hoje = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(valor);
  if (!m) return false;
  const mes = Number(m[1]);
  const ano = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  return ano > hoje.getFullYear() || (ano === hoje.getFullYear() && mes >= hoje.getMonth() + 1);
}

export function formatarCpf(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  return n
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function cpfValido(valor: string): boolean {
  const cpf = valor.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, peso: number) => {
    const soma = [...base].reduce((acc, d, i) => acc + Number(d) * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export interface CartaoTokenizado {
  token: string;
  bandeira: Bandeira;
  final: string;
}

/**
 * TOKENIZAÇÃO SIMULADA (ambiente de demonstração).
 *
 * Em produção, substitua por o SDK do gateway (ex.: Mercado Pago `createCardToken`,
 * Pagar.me `tokenizecard`, Stripe Elements): os dados do cartão vão do navegador
 * direto para o gateway, que devolve um token. A API do Farol recebe apenas o
 * token, a bandeira e os 4 últimos dígitos — nunca o número completo nem o CVV.
 */
export async function tokenizarCartaoSimulado(numero: string): Promise<CartaoTokenizado> {
  const n = numero.replace(/\D/g, '');
  const aleatorio = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  return { token: `sim_tok_${aleatorio}`, bandeira: detectarBandeira(n), final: n.slice(-4) };
}
