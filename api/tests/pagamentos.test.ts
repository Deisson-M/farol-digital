import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SituacaoMatricula, SituacaoPagamento } from '../src/db/schema/enums.js';
import { ErroAplicacao } from '../src/lib/erros.js';
import type { EventoAuditoria } from '../src/modules/auditoria/auditoria.service.js';
import {
  assinarWebhook,
  assinaturaValida,
  cpfValido,
  gerarLinhaDigitavelSimulada,
  mascararCpf,
  opcoesParcelamento,
  somarDiasUteis,
  transicaoPermitida,
  validarParcelas,
} from '../src/modules/pagamentos/pagamentos.regras.js';
import {
  PagamentosService,
  type CursoVenda,
  type NovoPagamento,
  type PagamentoRegistro,
  type PagamentosRepository,
  type PedidoRegistro,
} from '../src/modules/pagamentos/pagamentos.service.js';
import { ProvedorSimulado } from '../src/modules/pagamentos/provedores.js';

describe('regras de pagamento', () => {
  it('parcelamento sem juros até 6x com parcela mínima de R$ 10', () => {
    assert.equal(opcoesParcelamento(14990).length, 6);
    assert.equal(opcoesParcelamento(3990).length, 3);
    assert.equal(opcoesParcelamento(500).length, 1);
    assert.deepEqual(opcoesParcelamento(9990)[2], { parcelas: 3, valorParcelaCentavos: 3330 });
  });

  it('só o crédito parcela', () => {
    assert.equal(validarParcelas('cartao_credito', 6, 14990), null);
    assert.match(validarParcelas('cartao_credito', 6, 3990) ?? '', /máximo 3x/);
    assert.match(validarParcelas('pix', 2, 14990) ?? '', /Somente o cartão de crédito/);
    assert.equal(validarParcelas('boleto', 1, 14990), null);
  });

  it('valida e mascara CPF', () => {
    assert.equal(cpfValido('529.982.247-25'), true);
    assert.equal(cpfValido('52998224724'), false);
    assert.equal(cpfValido('111.111.111-11'), false);
    assert.equal(mascararCpf('529.982.247-25'), '***.982.247-**');
  });

  it('boleto vence em 3 dias úteis (pula fim de semana)', () => {
    // Quinta-feira 2026-10-22 → segunda 2026-10-26? Qui+1=Sex, +2=Seg, +3=Ter
    assert.equal(somarDiasUteis(new Date('2026-10-22T15:00:00Z'), 3).toISOString().slice(0, 10), '2026-10-27');
  });

  it('linha digitável simulada tem 47 dígitos', () => {
    assert.equal(gerarLinhaDigitavelSimulada(9990).replace(/\D/g, '').length, 47);
  });

  it('transições: pendente muda; estados finais não', () => {
    assert.equal(transicaoPermitida('pendente', 'aprovado'), true);
    assert.equal(transicaoPermitida('aprovado', 'recusado'), false);
    assert.equal(transicaoPermitida('expirado', 'aprovado'), false);
  });

  it('assinatura de webhook confere apenas com o segredo correto', () => {
    const corpo = '{"referencia":"sim_1","situacao":"aprovado"}';
    const segredo = 'segredo-de-teste-com-mais-de-32-caracteres';
    const assinatura = assinarWebhook(corpo, segredo);
    assert.equal(assinaturaValida(corpo, assinatura, segredo), true);
    assert.equal(assinaturaValida(corpo + ' ', assinatura, segredo), false);
    assert.equal(assinaturaValida(corpo, assinatura, 'outro-segredo-com-mais-de-32-caracteres!'), false);
    assert.equal(assinaturaValida(corpo, undefined, segredo), false);
  });
});

// ---------------------------------------------------------------------------

class RepoMemoria implements PagamentosRepository {
  cursos = new Map<number, CursoVenda>();
  matriculas = new Map<string, SituacaoMatricula>();
  pedidos: PedidoRegistro[] = [];
  pagamentos: Array<PagamentoRegistro & { chaveIdempotencia: string }> = [];
  async buscarCurso(id: number) {
    return this.cursos.get(id) ?? null;
  }
  async situacaoMatricula(u: number, c: number) {
    return this.matriculas.get(`${u}:${c}`) ?? null;
  }
  async buscarPedidoAberto(u: number, c: number) {
    return this.pedidos.find((p) => p.usuarioId === u && p.cursoId === c && p.situacao === 'aguardando_pagamento') ?? null;
  }
  async inserirPedido(d: { codigo: string; usuarioId: number; cursoId: number; valorCentavos: number }) {
    this.pedidos.push({ ...d, id: this.pedidos.length + 1, situacao: 'aguardando_pagamento', pagoEm: null, criadoEm: new Date() });
  }
  async buscarPedidoPorCodigo(codigo: string) {
    return this.pedidos.find((p) => p.codigo === codigo) ?? null;
  }
  async buscarPedidoPorId(id: number) {
    return this.pedidos.find((p) => p.id === id) ?? null;
  }
  async buscarPagamentoPorChave(pedidoId: number, chave: string) {
    return this.pagamentos.find((p) => p.pedidoId === pedidoId && p.chaveIdempotencia === chave) ?? null;
  }
  async buscarPagamentoPorCodigo(codigo: string) {
    return this.pagamentos.find((p) => p.codigo === codigo) ?? null;
  }
  async buscarPagamentoPorId(id: number) {
    return this.pagamentos.find((p) => p.id === id) ?? null;
  }
  async buscarPagamentoPorReferencia(provedor: string, ref: string) {
    return this.pagamentos.find((p) => p.provedor === provedor && p.referenciaProvedor === ref) ?? null;
  }
  async listarPagamentos(pedidoId: number) {
    return this.pagamentos.filter((p) => p.pedidoId === pedidoId);
  }
  async inserirPagamento(d: NovoPagamento) {
    this.pagamentos.push({ ...d, id: this.pagamentos.length + 1, confirmadoEm: null, criadoEm: new Date(Date.now() + this.pagamentos.length) });
  }
  async atualizarPagamento(id: number, d: Partial<PagamentoRegistro>) {
    Object.assign(this.pagamentos.find((p) => p.id === id)!, d);
  }
  async mudarSituacaoSePendente(id: number, situacao: SituacaoPagamento, quando: Date, motivo?: string) {
    const p = this.pagamentos.find((x) => x.id === id)!;
    if (p.situacao !== 'pendente') return false;
    Object.assign(p, { situacao, motivoRecusa: motivo ?? null, confirmadoEm: situacao === 'aprovado' ? quando : null });
    return true;
  }
  async marcarPedidoPago(id: number, quando: Date) {
    const p = this.pedidos.find((x) => x.id === id)!;
    if (p.situacao === 'aguardando_pagamento') Object.assign(p, { situacao: 'pago', pagoEm: quando });
  }
  async garantirMatricula(u: number, c: number) {
    if (this.matriculas.get(`${u}:${c}`) !== 'concluida') this.matriculas.set(`${u}:${c}`, 'ativa');
  }
}

const COMPRADOR = 7;
const OUTRO = 8;
const CURSO_PAGO = 1;
const CURSO_GRATIS = 2;

async function esperarErro(p: Promise<unknown>, status: number) {
  await assert.rejects(p, (e: unknown) => e instanceof ErroAplicacao && e.status === status);
}

describe('PagamentosService (provedor simulado)', () => {
  let repo: RepoMemoria;
  let eventos: EventoAuditoria[];
  let agora: Date;
  let service: PagamentosService;
  const chave = (n: number) => `chave-de-teste-${String(n).padStart(4, '0')}`;
  const cartao = (final: string) => ({
    metodo: 'cartao_credito' as const,
    parcelas: 3,
    tokenPagamento: 'sim_tok_abcdef123456',
    cartao: { bandeira: 'visa', final },
  });

  beforeEach(() => {
    repo = new RepoMemoria();
    repo.cursos.set(CURSO_PAGO, { id: CURSO_PAGO, titulo: 'LGPD na prática', precoCentavos: 14990, publicado: true });
    repo.cursos.set(CURSO_GRATIS, { id: CURSO_GRATIS, titulo: 'Gratuito', precoCentavos: 0, publicado: true });
    eventos = [];
    agora = new Date('2026-10-20T12:00:00Z');
    service = new PagamentosService(repo, new ProvedorSimulado('http://app', () => agora), { registrar: async (e) => void eventos.push(e) }, () => agora);
  });

  it('cria pedido com o preço do banco e reaproveita o pedido em aberto', async () => {
    const a = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c1');
    const b = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c2');
    assert.equal(a.valorCentavos, 14990);
    assert.equal(a.codigo, b.codigo);
    assert.equal(a.parcelamento.length, 6);
    assert.equal(a.metodos.length, 6);
  });

  it('não cria pedido para curso gratuito nem para quem já tem acesso', async () => {
    await esperarErro(service.criarPedido(COMPRADOR, CURSO_GRATIS, 'c'), 422);
    repo.matriculas.set(`${COMPRADOR}:${CURSO_PAGO}`, 'ativa');
    await esperarErro(service.criarPedido(COMPRADOR, CURSO_PAGO, 'c'), 409);
  });

  it('cartão aprovado: pedido pago, matrícula liberada, só final do cartão guardado', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    const pg = await service.pagar(COMPRADOR, pedido.codigo, chave(1), cartao('4242'), 'c');
    assert.equal(pg.situacao, 'aprovado');
    assert.deepEqual(pg.cartao, { bandeira: 'visa', final: '4242' });
    assert.equal(repo.pedidos[0]?.situacao, 'pago');
    assert.equal(repo.matriculas.get(`${COMPRADOR}:${CURSO_PAGO}`), 'ativa');
    assert.ok(eventos.some((e) => e.acao === 'pagamento.aprovar'));
    assert.ok(!JSON.stringify(repo.pagamentos).includes('sim_tok_abcdef123456'), 'token não deve ser persistido');
  });

  it('cartão recusado não libera acesso e permite tentar outro método', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    const recusado = await service.pagar(COMPRADOR, pedido.codigo, chave(1), cartao('0002'), 'c');
    assert.equal(recusado.situacao, 'recusado');
    assert.match(recusado.motivoRecusa ?? '', /recusado/);
    assert.equal(repo.matriculas.size, 0);
    const pix = await service.pagar(COMPRADOR, pedido.codigo, chave(2), { metodo: 'pix', parcelas: 1 }, 'c');
    assert.equal(pix.situacao, 'pendente');
  });

  it('idempotência: mesma chave não gera nova cobrança', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    const a = await service.pagar(COMPRADOR, pedido.codigo, chave(1), cartao('4242'), 'c');
    const b = await service.pagar(COMPRADOR, pedido.codigo, chave(1), cartao('4242'), 'c');
    assert.equal(a.codigo, b.codigo);
    assert.equal(repo.pagamentos.length, 1);
    // Chave nova em pedido já pago é recusada.
    await esperarErro(service.pagar(COMPRADOR, pedido.codigo, chave(2), cartao('4242'), 'c'), 422);
  });

  it('Pix: fica pendente, impede segundo pagamento simultâneo e é confirmado pela notificação', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    const pix = await service.pagar(COMPRADOR, pedido.codigo, chave(1), { metodo: 'pix', parcelas: 1 }, 'c');
    assert.ok(pix.pixCopiaCola?.startsWith('SIMULADO-PIX'));
    assert.equal(pix.expiraEm, new Date(agora.getTime() + 30 * 60 * 1000).toISOString());
    await esperarErro(service.pagar(COMPRADOR, pedido.codigo, chave(2), cartao('4242'), 'c'), 409);

    const ref = await service.referenciaParaSimulacao(COMPRADOR, pix.codigo);
    const confirmado = await service.processarNotificacao(ref, 'aprovado', 'webhook');
    assert.equal(confirmado.situacao, 'aprovado');
    assert.equal(repo.matriculas.get(`${COMPRADOR}:${CURSO_PAGO}`), 'ativa');
    // Notificação repetida é ignorada; transição inválida é recusada.
    assert.equal((await service.processarNotificacao(ref, 'aprovado', 'webhook')).situacao, 'aprovado');
    await esperarErro(service.processarNotificacao(ref, 'recusado', 'webhook'), 422);
    assert.equal(eventos.filter((e) => e.acao === 'pagamento.aprovar').length, 1);
  });

  it('Pix expira após 30 minutos e libera nova tentativa', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    const pix = await service.pagar(COMPRADOR, pedido.codigo, chave(1), { metodo: 'pix', parcelas: 1 }, 'c');
    agora = new Date(agora.getTime() + 31 * 60 * 1000);
    assert.equal((await service.obterPagamento(COMPRADOR, pix.codigo)).situacao, 'expirado');
    const novo = await service.pagar(COMPRADOR, pedido.codigo, chave(2), cartao('4242'), 'c');
    assert.equal(novo.situacao, 'aprovado');
  });

  it('boleto exige CPF válido e guarda somente o CPF mascarado', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    await esperarErro(
      service.pagar(COMPRADOR, pedido.codigo, chave(1), { metodo: 'boleto', parcelas: 1, pagador: { nome: 'Bruno Souza', cpf: '111.111.111-11' } }, 'c'),
      422,
    );
    const boleto = await service.pagar(
      COMPRADOR,
      pedido.codigo,
      chave(2),
      { metodo: 'boleto', parcelas: 1, pagador: { nome: 'Bruno Souza', cpf: '529.982.247-25' } },
      'c',
    );
    assert.equal(boleto.situacao, 'pendente');
    assert.equal(boleto.boletoVencimento, '2026-10-23');
    assert.ok(!JSON.stringify(repo.pagamentos).includes('529.982.247-25'));
    assert.ok(JSON.stringify(repo.pagamentos).includes('***.982.247-**'));
  });

  it('PayPal gera link de aprovação; parcelar fora do crédito é recusado', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    await esperarErro(service.pagar(COMPRADOR, pedido.codigo, chave(1), { metodo: 'paypal', parcelas: 2 }, 'c'), 422);
    const pp = await service.pagar(COMPRADOR, pedido.codigo, chave(2), { metodo: 'paypal', parcelas: 1 }, 'c');
    assert.match(pp.urlAprovacao ?? '', /^http:\/\/app\/pagamento\/paypal-simulado\//);
  });

  it('comprador cancela pagamento pendente; terceiros não veem pedido nem pagamento', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    const pix = await service.pagar(COMPRADOR, pedido.codigo, chave(1), { metodo: 'pix', parcelas: 1 }, 'c');
    await esperarErro(service.obterPedido(OUTRO, pedido.codigo), 404);
    await esperarErro(service.obterPagamento(OUTRO, pix.codigo), 404);
    await esperarErro(service.cancelarPagamento(OUTRO, pix.codigo, 'c'), 404);
    assert.equal((await service.cancelarPagamento(COMPRADOR, pix.codigo, 'c')).situacao, 'cancelado');
    await esperarErro(service.cancelarPagamento(COMPRADOR, pix.codigo, 'c'), 422);
  });

  it('carteira digital aprova com token; débito não aceita parcelas', async () => {
    const pedido = await service.criarPedido(COMPRADOR, CURSO_PAGO, 'c');
    await esperarErro(
      service.pagar(COMPRADOR, pedido.codigo, chave(1), { ...cartao('4242'), metodo: 'cartao_debito', parcelas: 2 }, 'c'),
      422,
    );
    const w = await service.pagar(COMPRADOR, pedido.codigo, chave(2), { metodo: 'carteira_digital', parcelas: 1, tokenPagamento: 'sim_wallet_123456' }, 'c');
    assert.equal(w.situacao, 'aprovado');
  });
});
