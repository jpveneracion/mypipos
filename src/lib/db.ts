/**
 * Database connection utility for myPiPOS
 * Uses same approach as mypiroll for Neon compatibility
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Simple database configuration - works with Neon
let pool: Pool | null = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false,
  },
});

/**
 * Initialize database connection pool
 */
export function initDb(): Pool {
  // Pool is already initialized at module level
  // This function is kept for backwards compatibility

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
        rejectUnauthorized: false,
      },
    });
  }

  pool.on('error', (err) => {
    console.error('Unexpected database client error:', err);
    process.exit(-1);
  });

  console.log('Database connection pool initialized');
  return pool;
}

/**
 * Get database connection pool
 */
export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
        rejectUnauthorized: false,
      },
    });
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