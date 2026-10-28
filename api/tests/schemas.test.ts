import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import '../src/lib/zod-pt.js';
import { cadastroBody, redefinirSenhaBody } from '../src/modules/auth/auth.schemas.js';
import { cabecalhoIdempotencia, pagarBody } from '../src/modules/pagamentos/pagamentos.schemas.js';

const base = { nome: 'Ana Lima', email: ' ANA@Exemplo.com ', senha: 'Senha2026', aceiteTermos: true };

describe('validação do cadastro', () => {
  it('aceita aluno e normaliza e-mail', () => {
    const r = cadastroBody.parse({ ...base, tipo: 'aluno' });
    assert.equal(r.email, 'ana@exemplo.com');
  });

  it('docente exige área de atuação', () => {
    assert.equal(cadastroBody.safeParse({ ...base, tipo: 'docente' }).success, false);
    assert.equal(cadastroBody.safeParse({ ...base, tipo: 'docente', areaAtuacao: 'Matemática' }).success, true);
  });

  it('exige aceite dos termos, nome e sobrenome e não aceita papel enviado pelo cliente', () => {
    const semTermos = cadastroBody.safeParse({ ...base, tipo: 'aluno', aceiteTermos: false });
    assert.equal(semTermos.success, false);
    assert.match(semTermos.error!.issues[0]!.message, /Termos de Uso/);
    assert.equal(cadastroBody.safeParse({ ...base, tipo: 'aluno', nome: 'Ana' }).success, false);
    assert.equal(cadastroBody.safeParse({ ...base, tipo: 'aluno', papel: 'admin' }).success, false);
    assert.equal(cadastroBody.safeParse({ ...base, tipo: 'admin' }).success, false);
  });

  it('telefone opcional, mas com DDD quando informado', () => {
    assert.equal(cadastroBody.safeParse({ ...base, tipo: 'aluno', telefone: '(61) 99999-1234' }).success, true);
    assert.equal(cadastroBody.safeParse({ ...base, tipo: 'aluno', telefone: '9999' }).success, false);
  });

  it('redefinição exige token e senha mínima', () => {
    assert.equal(redefinirSenhaBody.safeParse({ token: 'x'.repeat(43), novaSenha: 'curta' }).success, false);
  });
});

describe('validação do pagamento', () => {
  const cartao = { metodo: 'cartao_credito', parcelas: 2, tokenPagamento: 'sim_tok_123456789', cartao: { bandeira: 'visa', final: '4242' } };

  it('aceita cartão tokenizado', () => {
    assert.equal(pagarBody.safeParse(cartao).success, true);
  });

  it('REJEITA número completo do cartão e CVV (nunca chegam à API)', () => {
    assert.equal(pagarBody.safeParse({ ...cartao, numero: '4242424242424242' }).success, false);
    assert.equal(pagarBody.safeParse({ ...cartao, cvv: '123' }).success, false);
    assert.equal(pagarBody.safeParse({ ...cartao, cartao: { ...cartao.cartao, numero: '4242424242424242' } }).success, false);
  });

  it('débito, Pix e PayPal não parcelam; boleto exige pagador', () => {
    assert.equal(pagarBody.safeParse({ ...cartao, metodo: 'cartao_debito', parcelas: 2 }).success, false);
    assert.equal(pagarBody.safeParse({ metodo: 'pix', parcelas: 3 }).success, false);
    assert.deepEqual(pagarBody.parse({ metodo: 'pix' }), { metodo: 'pix', parcelas: 1 });
    assert.equal(pagarBody.safeParse({ metodo: 'boleto' }).success, false);
    assert.equal(pagarBody.safeParse({ metodo: 'boleto', pagador: { nome: 'Ana Lima', cpf: '529.982.247-25' } }).success, true);
    assert.equal(pagarBody.safeParse({ metodo: 'bitcoin' }).success, false);
  });

  it('Idempotency-Key obrigatória e com formato seguro', () => {
    assert.equal(cabecalhoIdempotencia.safeParse({}).success, false);
    assert.equal(cabecalhoIdempotencia.safeParse({ 'idempotency-key': 'curta' }).success, false);
    assert.equal(cabecalhoIdempotencia.safeParse({ 'idempotency-key': 'a1b2c3d4e5f6g7h8i9j0' }).success, true);
  });
});
