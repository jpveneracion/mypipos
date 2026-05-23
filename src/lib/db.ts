/**
 * Database connection utility for myPiPOS
 * This will be used when actual database connection is established
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Database configuration - prioritize connection string for Neon
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Explicitly set these to undefined to prevent conflicts
      host: undefined,
      port: undefined,
      database: undefined,
      user: undefined,
      password: undefined,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'mypipos',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initDb(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig);

    pool.on('error', (err) => {
      console.error('Unexpected database client error:', err);
      process.exit(-1);
    });

    console.log('Database connection pool initialized');
  }

  return pool;
}

/**
 * Get database connection pool
 */
export function getDb(): Pool {
  if (!pool) {
    return initDb();
  }
  return pool;
}

/**
 * Execute a SQL query with parameters
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const db = getDb();
    const res = await db.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const db = getDb();
  const client = await db.connect();
  return client;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Health check for database
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  details?: any;
}> {
  try {
    const result = await query(`
      SELECT
        version() as postgres_version,
        current_database() as database_name,
        current_user as database_user
    `);

    return {
      status: 'healthy',
      details: result.rows[0]
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

/**
 * Close database connection pool (for graceful shutdown)
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}

// Export types for use in other files
export type { Pool, PoolClient, QueryResult };