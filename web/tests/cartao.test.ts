import { describe, expect, it } from 'vitest';
import { cpfValido, detectarBandeira, formatarCpf, formatarNumeroCartao, luhnValido, validadeOk } from '../src/lib/cartao';
import { formatarPreco } from '../src/lib/formatos';

describe('utilitários de pagamento', () => {
  it('valida número de cartão (Luhn) e detecta bandeira', () => {
    expect(luhnValido('4242 4242 4242 4242')).toBe(true);
    expect(luhnValido('4242 4242 4242 4241')).toBe(false);
    expect(detectarBandeira('4242424242424242')).toBe('visa');
    expect(detectarBandeira('5555555555554444')).toBe('mastercard');
    expect(detectarBandeira('378282246310005')).toBe('amex');
    expect(detectarBandeira('6362970000457013')).toBe('elo');
  });

  it('formata cartão, CPF e preço', () => {
    expect(formatarNumeroCartao('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatarNumeroCartao('378282246310005')).toBe('3782 822463 10005');
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(formatarPreco(0)).toBe('Gratuito');
    expect(formatarPreco(14990).replace(/\s/g, ' ')).toBe('R$ 149,90');
  });

  it('valida validade do cartão', () => {
    const hoje = new Date('2026-10-20');
    expect(validadeOk('10/26', hoje)).toBe(true);
    expect(validadeOk('09/26', hoje)).toBe(false);
    expect(validadeOk('13/30', hoje)).toBe(false);
  });
});
