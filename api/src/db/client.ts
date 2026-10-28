import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  // Bancos na nuvem (ex.: Aiven) exigem conexão criptografada: DATABASE_SSL=true.
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  connectionLimit: 10,
  // Datas sempre em UTC entre API e banco.
  timezone: 'Z',
});

export const db = drizzle(pool, { schema, mode: 'default' });
export type Database = typeof db;
