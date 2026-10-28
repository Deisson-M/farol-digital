import { randomUUID } from 'node:crypto';
import type {
  MetodoPagamento,
  SituacaoMatricula,
  SituacaoPagamento,
  SituacaoPedido,
} from '../../db/schema/enums.js';
import { conflito, naoEncontrado, regraNegocio } from '../../lib/erros.js';
import type { RegistroAuditoria } from '../auditoria/auditoria.service.js';
import {
  cpfValido,
  mascararCpf,
  opcoesParcelamento,
  ROTULO_METODO,
  transicaoPermitida,
  validarParcelas,
} from './pagamentos.regras.js';
import type { ProvedorPagamento, ResultadoCobranca } from './provedores.js';

export interface CursoVenda {
  id: number;
  titulo: string;
  precoCentavos: number;
  publicado: boolean;
}

export interface PedidoRegistro {
  id: number;
  codigo: string;
  usuarioId: number;
  cursoId: number;
  valorCentavos: number;
  situacao: SituacaoPedido;
  pagoEm: Date | null;
  criadoEm: Date;
}

export interface PagamentoRegistro {
  id: number;
  codigo: string;
  pedidoId: number;
  metodo: MetodoPagamento;
  situacao: SituacaoPagamento;
  valorCentavos: number;
  parcelas: number;
  provedor: string;
  referenciaProvedor: string | null;
  cartaoBandeira: string | null;
  cartaoFinal: string | null;
  pixCopiaCola: string | null;
  boletoLinhaDigitavel: string | null;
  boletoVencimento: string | null;
  urlAprovacao: string | null;
  expiraEm: Date | null;
  motivoRecusa: string | null;
  confirmadoEm: Date | null;
  criadoEm: Date;
}

export type NovoPagamento = Omit<PagamentoRegistro, 'id' | 'criadoEm' | 'confirmadoEm'> & {
  chaveIdempotencia: string;
  pagadorDocumentoMascarado: string | null;
};

export interface PagamentosRepository {
  buscarCurso(id: number): Promise<CursoVenda | null>;
  situacaoMatricula(usuarioId: number, cursoId: number): Promise<SituacaoMatricula | null>;
  buscarPedidoAberto(usuarioId: number, cursoId: number): Promise<PedidoRegistro | null>;
  inserirPedido(dados: { codigo: string; usuarioId: number; cursoId: number; valorCentavos: number }): Promise<void>;
  buscarPedidoPorCodigo(codigo: string): Promise<PedidoRegistro | null>;
  buscarPedidoPorId(id: number): Promise<PedidoRegistro | null>;
  buscarPagamentoPorChave(pedidoId: number, chave: string): Promise<PagamentoRegistro | null>;
  buscarPagamentoPorCodigo(codigo: string): Promise<PagamentoRegistro | null>;
  buscarPagamentoPorId(id: number): Promise<PagamentoRegistro | null>;
  buscarPagamentoPorReferencia(provedor: string, referencia: string): Promise<PagamentoRegistro | null>;
  listarPagamentos(pedidoId: number): Promise<PagamentoRegistro[]>;
  inserirPagamento(dados: NovoPagamento): Promise<void>;
  atualizarPagamento(id: number, dados: Partial<PagamentoRegistro>): Promise<void>;
  /** UPDATE ... WHERE situacao = 'pendente'. Retorna false se outra requisição já mudou a situação. */
  mudarSituacaoSePendente(id: number, situacao: SituacaoPagamento, quando: Date, motivo?: string): Promise<boolean>;
  marcarPedidoPago(pedidoId: number, quando: Date): Promise<void>;
  /** Cria matrícula ativa ou reativa uma cancelada/trancada. */
  garantirMatricula(usuarioId: number, cursoId: number): Promise<void>;
}

export interface DadosPagamento {
  metodo: MetodoPagamento;
  parcelas: number;
  tokenPagamento?: string;
  cartao?: { bandeira: string; final: string };
  pagador?: { nome: string; cpf: string };
}

interface Contexto {
  usuarioId: number | null;
  correlacaoId: string;
}

const METODOS: MetodoPagamento[] = ['cartao_credito', 'cartao_debito', 'pix', 'boleto', 'paypal', 'carteira_digital'];

export class PagamentosService {
  constructor(
    private readonly repo: PagamentosRepository,
    private readonly provedor: ProvedorPagamento,
    private readonly auditoria: RegistroAuditoria,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  /** Cria (ou reaproveita) o pedido de um curso pago. O preço vem sempre do banco. */
  async criarPedido(usuarioId: number, cursoId: number, correlacaoId: string) {
    const curso = await this.repo.buscarCurso(cursoId);
    if (!curso || !curso.publicado) throw naoEncontrado('Curso');
    if (curso.precoCentavos <= 0) throw regraNegocio('Este curso é gratuito: faça a matrícula diretamente.');

    const matricula = await this.repo.situacaoMatricula(usuarioId, cursoId);
    if (matricula === 'ativa' || matricula === 'concluida') throw conflito('Você já tem acesso a este curso.');

    const aberto = await this.repo.buscarPedidoAberto(usuarioId, cursoId);
    if (aberto && aberto.valorCentavos === curso.precoCentavos) return this.visaoPedido(aberto, curso);

    const codigo = randomUUID();
    await this.repo.inserirPedido({ codigo, usuarioId, cursoId, valorCentavos: curso.precoCentavos });
    await this.auditoria.registrar({
      usuarioId,
      acao: 'pedido.criar',
      recursoTipo: 'pedido',
      recursoId: codigo,
      resultado: 'sucesso',
      correlacaoId,
      detalhes: { cursoId, valorCentavos: curso.precoCentavos },
    });
    const pedido = await this.repo.buscarPedidoPorCodigo(codigo);
    if (!pedido) throw new Error('Pedido recém-criado não encontrado.');
    return this.visaoPedido(pedido, curso);
  }

  async obterPedido(usuarioId: number, codigo: string) {
    const pedido = await this.pedidoDoUsuario(usuarioId, codigo);
    const curso = await this.repo.buscarCurso(pedido.cursoId);
    if (!curso) throw naoEncontrado('Curso');
    return this.visaoPedido(pedido, curso);
  }

  async pagar(usuarioId: number, codigoPedido: string, chave: string, dados: DadosPagamento, correlacaoId: string) {
    const pedido = await this.pedidoDoUsuario(usuarioId, codigoPedido);

    // Idempotência: repetir a mesma requisição devolve o mesmo pagamento, sem nova cobrança.
    const repetido = await this.repo.buscarPagamentoPorChave(pedido.id, chave);
    if (repetido) return this.visaoPagamento(await this.atualizarExpiracao(repetido));

    if (pedido.situacao !== 'aguardando_pagamento') throw regraNegocio('Este pedido não está mais aguardando pagamento.');

    const pagamentos = await Promise.all((await this.repo.listarPagamentos(pedido.id)).map((p) => this.atualizarExpiracao(p)));
    if (pagamentos.some((p) => p.situacao === 'aprovado')) throw conflito('Este pedido já foi pago.');
    if (pagamentos.some((p) => p.situacao === 'pendente')) {
      throw conflito('Já existe um pagamento em andamento para este pedido. Conclua-o ou cancele antes de tentar outro método.');
    }

    const erroParcelas = validarParcelas(dados.metodo, dados.parcelas, pedido.valorCentavos);
    if (erroParcelas) throw regraNegocio(erroParcelas);

    const exigeToken = ['cartao_credito', 'cartao_debito', 'carteira_digital'].includes(dados.metodo);
    if (exigeToken && !dados.tokenPagamento) throw regraNegocio('Autorização de pagamento ausente.');
    if ((dados.metodo === 'cartao_credito' || dados.metodo === 'cartao_debito') && !dados.cartao) {
      throw regraNegocio('Informe a bandeira e o final do cartão.');
    }
    if (dados.metodo === 'boleto') {
      if (!dados.pagador) throw regraNegocio('Informe nome e CPF do pagador para emitir o boleto.');
      if (!cpfValido(dados.pagador.cpf)) throw regraNegocio('CPF inválido.');
    }

    const curso = await this.repo.buscarCurso(pedido.cursoId);
    const codigo = randomUUID();
    await this.repo.inserirPagamento({
      codigo,
      pedidoId: pedido.id,
      metodo: dados.metodo,
      situacao: 'pendente',
      valorCentavos: pedido.valorCentavos,
      parcelas: dados.parcelas,
      chaveIdempotencia: chave,
      provedor: this.provedor.nome,
      referenciaProvedor: null,
      cartaoBandeira: dados.cartao?.bandeira ?? null,
      cartaoFinal: dados.cartao?.final ?? null,
      pagadorDocumentoMascarado: dados.pagador ? mascararCpf(dados.pagador.cpf) : null,
      pixCopiaCola: null,
      boletoLinhaDigitavel: null,
      boletoVencimento: null,
      urlAprovacao: null,
      expiraEm: null,
      motivoRecusa: null,
    });
    const criado = await this.repo.buscarPagamentoPorCodigo(codigo);
    if (!criado) throw new Error('Pagamento recém-criado não encontrado.');

    let resultado: ResultadoCobranca;
    try {
      resultado = await this.provedor.criarCobranca({
        codigoPagamento: codigo,
        metodo: dados.metodo,
        valorCentavos: pedido.valorCentavos,
        parcelas: dados.parcelas,
        descricao: `Farol Digital — ${curso?.titulo ?? 'Curso'}`,
        tokenPagamento: dados.tokenPagamento,
        cartaoFinal: dados.cartao?.final,
        pagador: dados.pagador,
      });
    } catch {
      await this.repo.mudarSituacaoSePendente(criado.id, 'recusado', this.relogio(), 'Não foi possível falar com o provedor de pagamento. Tente novamente.');
      await this.auditarPagamento({ usuarioId, correlacaoId }, 'pagamento.falha_provedor', codigo, 'falha', { metodo: dados.metodo });
      return this.visaoPagamento((await this.repo.buscarPagamentoPorCodigo(codigo)) ?? criado);
    }

    await this.repo.atualizarPagamento(criado.id, {
      referenciaProvedor: resultado.referencia,
      pixCopiaCola: resultado.pixCopiaCola ?? null,
      boletoLinhaDigitavel: resultado.boletoLinhaDigitavel ?? null,
      boletoVencimento: resultado.boletoVencimento ?? null,
      urlAprovacao: resultado.urlAprovacao ?? null,
      expiraEm: resultado.expiraEm ?? null,
    });
    await this.auditarPagamento({ usuarioId, correlacaoId }, 'pagamento.criar', codigo, 'sucesso', {
      metodo: dados.metodo,
      parcelas: dados.parcelas,
      valorCentavos: pedido.valorCentavos,
    });

    if (resultado.situacao === 'aprovado') await this.aprovar(criado.id, { usuarioId, correlacaoId });
    if (resultado.situacao === 'recusado') {
      await this.repo.mudarSituacaoSePendente(criado.id, 'recusado', this.relogio(), resultado.motivoRecusa ?? 'Pagamento recusado.');
      await this.auditarPagamento({ usuarioId, correlacaoId }, 'pagamento.recusar', codigo, 'falha', { metodo: dados.metodo });
    }
    return this.visaoPagamento((await this.repo.buscarPagamentoPorCodigo(codigo)) ?? criado);
  }

  async obterPagamento(usuarioId: number, codigo: string) {
    const pagamento = await this.repo.buscarPagamentoPorCodigo(codigo);
    if (!pagamento) throw naoEncontrado('Pagamento');
    const pedido = await this.repo.buscarPedidoPorId(pagamento.pedidoId);
    if (!pedido || pedido.usuarioId !== usuarioId) throw naoEncontrado('Pagamento');
    return this.visaoPagamento(await this.atualizarExpiracao(pagamento));
  }

  /** O próprio comprador desiste de um pagamento pendente (ex.: trocar Pix por cartão). */
  async cancelarPagamento(usuarioId: number, codigo: string, correlacaoId: string) {
    const pagamento = await this.repo.buscarPagamentoPorCodigo(codigo);
    const pedido = pagamento ? await this.repo.buscarPedidoPorId(pagamento.pedidoId) : null;
    if (!pagamento || !pedido || pedido.usuarioId !== usuarioId) throw naoEncontrado('Pagamento');
    if (!(await this.repo.mudarSituacaoSePendente(pagamento.id, 'cancelado', this.relogio(), 'Cancelado pelo comprador.'))) {
      throw regraNegocio('Somente pagamentos pendentes podem ser cancelados.');
    }
    await this.auditarPagamento({ usuarioId, correlacaoId }, 'pagamento.cancelar', codigo, 'sucesso', {});
    return this.visaoPagamento((await this.repo.buscarPagamentoPorCodigo(codigo)) ?? pagamento);
  }

  /** Confirmação assíncrona vinda do provedor (webhook). Idempotente. */
  async processarNotificacao(referencia: string, situacao: 'aprovado' | 'recusado' | 'expirado', correlacaoId: string) {
    const pagamento = await this.repo.buscarPagamentoPorReferencia(this.provedor.nome, referencia);
    if (!pagamento) throw naoEncontrado('Pagamento');
    if (pagamento.situacao === situacao) return this.visaoPagamento(pagamento);
    if (!transicaoPermitida(pagamento.situacao, situacao)) {
      throw regraNegocio(`Transição de ${pagamento.situacao} para ${situacao} não é permitida.`);
    }
    const ctx = { usuarioId: null, correlacaoId };
    if (situacao === 'aprovado') await this.aprovar(pagamento.id, ctx);
    else if (await this.repo.mudarSituacaoSePendente(pagamento.id, situacao, this.relogio(), situacao === 'expirado' ? 'Prazo de pagamento expirado.' : 'Pagamento recusado.')) {
      await this.auditarPagamento(ctx, `pagamento.${situacao === 'expirado' ? 'expirar' : 'recusar'}`, pagamento.codigo, 'falha', { origem: 'webhook' });
    }
    return this.visaoPagamento((await this.repo.buscarPagamentoPorCodigo(pagamento.codigo)) ?? pagamento);
  }

  /** Referência do provedor para a simulação de confirmação (somente desenvolvimento). */
  async referenciaParaSimulacao(usuarioId: number, codigo: string) {
    const pagamento = await this.repo.buscarPagamentoPorCodigo(codigo);
    const pedido = pagamento ? await this.repo.buscarPedidoPorId(pagamento.pedidoId) : null;
    if (!pagamento || !pedido || pedido.usuarioId !== usuarioId || !pagamento.referenciaProvedor) throw naoEncontrado('Pagamento');
    return pagamento.referenciaProvedor;
  }

  // ---------- internos ----------

  private async aprovar(pagamentoId: number, ctx: Contexto) {
    const agora = this.relogio();
    const mudou = await this.repo.mudarSituacaoSePendente(pagamentoId, 'aprovado', agora);
    if (!mudou) return; // outra requisição já confirmou (ou o pagamento não está mais pendente)

    const registro = await this.repo.buscarPagamentoPorId(pagamentoId);
    const pedido = registro ? await this.repo.buscarPedidoPorId(registro.pedidoId) : null;
    if (!registro || !pedido) throw new Error('Pagamento aprovado sem pedido associado.');

    await this.repo.marcarPedidoPago(pedido.id, agora);
    await this.repo.garantirMatricula(pedido.usuarioId, pedido.cursoId);
    await this.auditarPagamento({ usuarioId: ctx.usuarioId ?? pedido.usuarioId, correlacaoId: ctx.correlacaoId }, 'pagamento.aprovar', registro.codigo, 'sucesso', {
      metodo: registro.metodo,
      valorCentavos: registro.valorCentavos,
      cursoId: pedido.cursoId,
    });
  }

  private async pedidoDoUsuario(usuarioId: number, codigo: string) {
    const pedido = await this.repo.buscarPedidoPorCodigo(codigo);
    // Pedido de outra pessoa é tratado como inexistente.
    if (!pedido || pedido.usuarioId !== usuarioId) throw naoEncontrado('Pedido');
    return pedido;
  }

  /** Marca como expirado um Pix/boleto/PayPal pendente cujo prazo passou. */
  private async atualizarExpiracao(p: PagamentoRegistro): Promise<PagamentoRegistro> {
    if (p.situacao !== 'pendente' || !p.expiraEm || p.expiraEm.getTime() > this.relogio().getTime()) return p;
    await this.repo.mudarSituacaoSePendente(p.id, 'expirado', this.relogio(), 'Prazo de pagamento expirado.');
    return (await this.repo.buscarPagamentoPorCodigo(p.codigo)) ?? p;
  }

  private async visaoPedido(pedido: PedidoRegistro, curso: CursoVenda) {
    const pagamentos = await Promise.all((await this.repo.listarPagamentos(pedido.id)).map((p) => this.atualizarExpiracao(p)));
    const atual = [...pagamentos].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())[0] ?? null;
    return {
      codigo: pedido.codigo,
      situacao: pedido.situacao,
      valorCentavos: pedido.valorCentavos,
      criadoEm: pedido.criadoEm.toISOString(),
      pagoEm: pedido.pagoEm?.toISOString() ?? null,
      curso: { id: curso.id, titulo: curso.titulo },
      metodos: METODOS.map((m) => ({ metodo: m, rotulo: ROTULO_METODO[m] })),
      parcelamento: opcoesParcelamento(pedido.valorCentavos),
      pagamentoAtual: atual ? this.visaoPagamento(atual) : null,
      ambienteDemonstracao: this.provedor.nome === 'simulado',
    };
  }

  private visaoPagamento(p: PagamentoRegistro) {
    return {
      codigo: p.codigo,
      metodo: p.metodo,
      situacao: p.situacao,
      valorCentavos: p.valorCentavos,
      parcelas: p.parcelas,
      cartao: p.cartaoFinal ? { bandeira: p.cartaoBandeira ?? 'cartão', final: p.cartaoFinal } : null,
      pixCopiaCola: p.pixCopiaCola,
      boletoLinhaDigitavel: p.boletoLinhaDigitavel,
      boletoVencimento: p.boletoVencimento,
      urlAprovacao: p.urlAprovacao,
      expiraEm: p.expiraEm?.toISOString() ?? null,
      motivoRecusa: p.motivoRecusa,
      confirmadoEm: p.confirmadoEm?.toISOString() ?? null,
      simulado: p.provedor === 'simulado',
    };
  }

  private auditarPagamento(ctx: Contexto, acao: string, codigo: string, resultado: 'sucesso' | 'falha', detalhes: Record<string, unknown>) {
    return this.auditoria.registrar({
      usuarioId: ctx.usuarioId,
      acao,
      recursoTipo: 'pagamento',
      recursoId: codigo,
      resultado,
      correlacaoId: ctx.correlacaoId,
      detalhes,
    });
  }
}
