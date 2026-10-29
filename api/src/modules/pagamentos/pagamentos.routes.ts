import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { env } from '../../config/env.js';
import { ErroAplicacao, naoEncontrado } from '../../lib/erros.js';
import { assinaturaValida } from './pagamentos.regras.js';
import {
  cabecalhoIdempotencia,
  codigoParam,
  criarPedidoBody,
  pagamentoSchema,
  pagarBody,
  pedidoSchema,
  simularBody,
  webhookBody,
} from './pagamentos.schemas.js';
import type { PagamentosService } from './pagamentos.service.js';

export const pagamentosRoutes: FastifyPluginAsyncZod<{ service: PagamentosService }> = async (app, { service }) => {
  app.post(
    '/pedidos',
    {
      onRequest: [app.autenticar],
      schema: { tags: ['pagamentos'], summary: 'Cria ou reaproveita o pedido de um curso pago', body: criarPedidoBody, response: { 201: pedidoSchema } },
    },
    async (request, reply) =>
      reply.status(201).send(await service.criarPedido(request.user.sub, request.body.cursoId, request.id)),
  );

  app.get(
    '/pedidos/:codigo',
    { onRequest: [app.autenticar], schema: { tags: ['pagamentos'], params: codigoParam, response: { 200: pedidoSchema } } },
    async (request) => service.obterPedido(request.user.sub, request.params.codigo),
  );

  app.post(
    '/pedidos/:codigo/pagamentos',
    {
      onRequest: [app.autenticar],
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
      schema: {
        tags: ['pagamentos'],
        summary: 'Paga o pedido (cartão, Pix, boleto, PayPal, carteira digital). Exige Idempotency-Key.',
        params: codigoParam,
        headers: cabecalhoIdempotencia,
        body: pagarBody,
        response: { 201: pagamentoSchema },
      },
    },
    async (request, reply) => {
      const b = request.body;
      const pagamento = await service.pagar(
        request.user.sub,
        request.params.codigo,
        request.headers['idempotency-key'],
        {
          metodo: b.metodo,
          parcelas: b.parcelas,
          tokenPagamento: 'tokenPagamento' in b ? b.tokenPagamento : undefined,
          cartao: 'cartao' in b ? b.cartao : undefined,
          pagador: 'pagador' in b ? b.pagador : undefined,
        },
        request.id,
      );
      return reply.status(201).send(pagamento);
    },
  );

  app.get(
    '/pagamentos/:codigo',
    { onRequest: [app.autenticar], schema: { tags: ['pagamentos'], params: codigoParam, response: { 200: pagamentoSchema } } },
    async (request) => service.obterPagamento(request.user.sub, request.params.codigo),
  );

  app.post(
    '/pagamentos/:codigo/cancelar',
    { onRequest: [app.autenticar], schema: { tags: ['pagamentos'], params: codigoParam, response: { 200: pagamentoSchema } } },
    async (request) => service.cancelarPagamento(request.user.sub, request.params.codigo, request.id),
  );

  // Simula a confirmação do provedor (Pix pago, boleto compensado, PayPal aprovado).
  // Disponível SOMENTE com o provedor simulado e fora de produção.
  app.post(
    '/pagamentos/:codigo/simular-confirmacao',
    {
      onRequest: [app.autenticar],
      schema: { tags: ['pagamentos'], params: codigoParam, body: simularBody, response: { 200: pagamentoSchema } },
    },
    async (request) => {
      if (env.NODE_ENV === 'production' || env.PAGAMENTOS_PROVEDOR !== 'simulado') throw naoEncontrado('Recurso');
      const referencia = await service.referenciaParaSimulacao(request.user.sub, request.params.codigo);
      return service.processarNotificacao(referencia, request.body.resultado, request.id);
    },
  );

  // Webhook do provedor: corpo bruto assinado com HMAC-SHA256 no cabeçalho x-assinatura.
  await app.register(async (webhook) => {
    webhook.addContentTypeParser('application/json', { parseAs: 'string' }, (request, corpo, feito) => {
      (request as unknown as { corpoBruto: string }).corpoBruto = corpo as string;
      try {
        feito(null, JSON.parse(corpo as string));
      } catch {
        feito(new ErroAplicacao(400, 'JSON_INVALIDO', 'Corpo da notificação inválido.'), undefined);
      }
    });

    webhook.post(
  '/webhooks/pagamentos/simulado',
  {
    schema: {
      tags: ['pagamentos'],
      body: webhookBody
    },
    hide: true
  },
      async (request, reply) => {
        const corpo = (request as unknown as { corpoBruto?: string }).corpoBruto ?? '';
        const assinatura = request.headers['x-assinatura'];
        if (!assinaturaValida(corpo, typeof assinatura === 'string' ? assinatura : undefined, env.PAGAMENTOS_WEBHOOK_SEGREDO)) {
          await app.auditoria.registrar({
            usuarioId: null,
            acao: 'pagamento.webhook',
            recursoTipo: 'pagamento',
            resultado: 'negado',
            correlacaoId: request.id,
            detalhes: { motivo: 'assinatura_invalida' },
          });
          throw new ErroAplicacao(401, 'ASSINATURA_INVALIDA', 'Assinatura do webhook inválida.');
        }
        await service.processarNotificacao(request.body.referencia, request.body.situacao, request.id);
        return reply.status(204).send();
      },
    );
  });
};
