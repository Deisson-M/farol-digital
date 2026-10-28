import { construirApp } from './app.js';
import { env } from './config/env.js';
import { db, pool } from './db/client.js';

const app = await construirApp({
  db,
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Nunca registrar credenciais em log.
    redact: ['req.headers.authorization', 'req.body.senha'],
  },
});

const encerrar = async (sinal: string) => {
  app.log.info(`Recebido ${sinal}, encerrando...`);
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', () => void encerrar('SIGINT'));
process.on('SIGTERM', () => void encerrar('SIGTERM'));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (erro) {
  app.log.error(erro);
  await pool.end();
  process.exit(1);
}
