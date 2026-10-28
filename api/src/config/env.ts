import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL mysql:// válida'),
  /** true para conectar com SSL (obrigatório em bancos gerenciados na nuvem). */
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((valor) =>
      valor
        .split(',')
        .map((origem) => origem.trim())
        .filter(Boolean),
    ),
  SEED_SENHA_PADRAO: z.string().min(8).optional(),
  /** Endereço do frontend, usado nos links enviados ao usuário (ex.: redefinir senha). */
  APP_URL: z.string().url().default('http://localhost:5173'),
  /** Provedor de pagamentos. Somente "simulado" está implementado nesta etapa. */
  PAGAMENTOS_PROVEDOR: z.enum(['simulado']).default('simulado'),
  /** Segredo HMAC para validar webhooks de pagamento (32+ caracteres). */
  PAGAMENTOS_WEBHOOK_SEGREDO: z.string().min(32, 'PAGAMENTOS_WEBHOOK_SEGREDO deve ter pelo menos 32 caracteres'),
});

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  console.error('Variáveis de ambiente inválidas:', resultado.error.flatten().fieldErrors);
  process.exit(1);
}

if (resultado.data.NODE_ENV === 'production' && resultado.data.PAGAMENTOS_PROVEDOR === 'simulado') {
  console.error('O provedor de pagamentos "simulado" não pode ser usado em produção. Configure um gateway real.');
  process.exit(1);
}

export const env = resultado.data;
export type Env = typeof env;
