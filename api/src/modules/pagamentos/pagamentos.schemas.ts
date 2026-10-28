import { z } from 'zod';
import { METODOS_PAGAMENTO, SITUACOES_PAGAMENTO, SITUACOES_PEDIDO } from '../../db/schema/enums.js';

export const BANDEIRAS = ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'outra'] as const;

export const codigoParam = z.object({ codigo: z.string().uuid('Código inválido.') });

export const criarPedidoBody = z.object({ cursoId: z.number().int().positive() }).strict();

export const cabecalhoIdempotencia = z.object({
  'idempotency-key': z
    .string({ required_error: 'Envie o cabeçalho Idempotency-Key.' })
    .regex(/^[A-Za-z0-9_-]{16,80}$/, 'Idempotency-Key inválida (16 a 80 caracteres alfanuméricos).'),
});

const token = z.string().trim().min(10).max(200);
const cartao = z
  .object({
    bandeira: z.enum(BANDEIRAS),
    final: z.string().regex(/^\d{4}$/, 'Informe os 4 últimos dígitos.'),
  })
  .strict();

/**
 * Dados do pagamento. `.strict()` rejeita campos como número do cartão ou
 * CVV: esses dados vão direto do navegador para o gateway, nunca para a API.
 */
export const pagarBody = z.discriminatedUnion('metodo', [
  z
    .object({
      metodo: z.literal('cartao_credito'),
      parcelas: z.number().int().min(1).max(12).default(1),
      tokenPagamento: token,
      cartao,
    })
    .strict(),
  z
    .object({ metodo: z.literal('cartao_debito'), parcelas: z.literal(1).default(1), tokenPagamento: token, cartao })
    .strict(),
  z.object({ metodo: z.literal('carteira_digital'), parcelas: z.literal(1).default(1), tokenPagamento: token }).strict(),
  z.object({ metodo: z.literal('pix'), parcelas: z.literal(1).default(1) }).strict(),
  z.object({ metodo: z.literal('paypal'), parcelas: z.literal(1).default(1) }).strict(),
  z
    .object({
      metodo: z.literal('boleto'),
      parcelas: z.literal(1).default(1),
      pagador: z
        .object({
          nome: z.string().trim().min(3).max(150),
          cpf: z.string().trim().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Informe um CPF com 11 dígitos.'),
        })
        .strict(),
    })
    .strict(),
]);
export type PagarDados = z.infer<typeof pagarBody>;

export const simularBody = z.object({ resultado: z.enum(['aprovado', 'recusado', 'expirado']) }).strict();

export const webhookBody = z.object({
  referencia: z.string().min(5).max(120),
  situacao: z.enum(['aprovado', 'recusado', 'expirado']),
});

export const pagamentoSchema = z.object({
  codigo: z.string(),
  metodo: z.enum(METODOS_PAGAMENTO),
  situacao: z.enum(SITUACOES_PAGAMENTO),
  valorCentavos: z.number(),
  parcelas: z.number(),
  cartao: z.object({ bandeira: z.string(), final: z.string() }).nullable(),
  pixCopiaCola: z.string().nullable(),
  boletoLinhaDigitavel: z.string().nullable(),
  boletoVencimento: z.string().nullable(),
  urlAprovacao: z.string().nullable(),
  expiraEm: z.string().nullable(),
  motivoRecusa: z.string().nullable(),
  confirmadoEm: z.string().nullable(),
  simulado: z.boolean(),
});

export const pedidoSchema = z.object({
  codigo: z.string(),
  situacao: z.enum(SITUACOES_PEDIDO),
  valorCentavos: z.number(),
  criadoEm: z.string(),
  pagoEm: z.string().nullable(),
  curso: z.object({ id: z.number(), titulo: z.string() }),
  metodos: z.array(z.object({ metodo: z.enum(METODOS_PAGAMENTO), rotulo: z.string() })),
  parcelamento: z.array(z.object({ parcelas: z.number(), valorParcelaCentavos: z.number() })),
  pagamentoAtual: pagamentoSchema.nullable(),
  ambienteDemonstracao: z.boolean(),
});
