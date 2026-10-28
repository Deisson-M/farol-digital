import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, pool } from './client.js';

async function executar() {
  console.log('Aplicando migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations aplicadas com sucesso.');
}

executar()
  .catch((erro: unknown) => {
    console.error('Falha ao aplicar migrations:', erro);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
