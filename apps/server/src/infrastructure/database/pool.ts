import pg from 'pg';
import { config } from '../../config/index.js';
import { logger } from '../../common/logger/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.db.url,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Pool xatolarini ushlash (server qulamasligi uchun)
pool.on('error', (err) => {
  logger.error('DatabasePool', `PostgreSQL pool kutilmagan xatolik: ${err.message}`);
});

export interface QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

/**
 * Type-Safe SQL so'rov ijrosi
 * Sekin so'rovlarni (>1000ms) avtomatik aniqlab, ogohlantiradi
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query(sql, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('DatabaseQuery', `Sekin so'rov (${duration}ms): ${sql.trim().slice(0, 150)}...`);
    }
    return { rows: res.rows as T[], rowCount: res.rowCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Noma\'lum xato';
    logger.error('DatabaseQuery', `SQL xatosi: ${message} | Query: ${sql.trim().slice(0, 150)}`);
    throw err;
  }
}

/**
 * Bitta qator qaytaruvchi so'rov
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const { rows } = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Tranzaksiya boshqaruvi
 * Xatolik bo'lsa avtomatik ROLLBACK qiladi
 */
export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Tranzaksiya ichida type-safe so'rov
 */
export async function txQuery<T = Record<string, unknown>>(
  client: pg.PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const res = await client.query(sql, params);
  return { rows: res.rows as T[], rowCount: res.rowCount };
}
