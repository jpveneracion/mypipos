/**
 * Database Migration Runner for myPiPOS
 * This script can be used to run database migrations in development and production
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Migration interface
interface Migration {
  id: string;
  name: string;
  filename: string;
  executed_at?: string;
}

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mypipos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

/**
 * Initialize database connection and create migrations table if needed
 */
async function initializeMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Migrations table initialized');
}

/**
 * Get executed migrations from database
 */
async function getExecutedMigrations(pool: Pool): Promise<Migration[]> {
  const result = await pool.query('SELECT * FROM schema_migrations ORDER BY executed_at');
  return result.rows;
}

/**
 * Get available migration files
 */
function getAvailableMigrations(): Migration[] {
  const migrationsDir = path.join(__dirname);
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && file !== 'migrate.ts');

  return files.map(filename => {
    const id = filename.replace('.sql', '');
    const name = filename
      .replace('.sql', '')
      .replace(/_/g, ' ')
      .replace(/^\d+/, '');

    return {
      id,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      filename
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Execute a single migration
 */
async function executeMigration(pool: Pool, migration: Migration): Promise<void> {
  const filePath = path.join(__dirname, migration.filename);
  const migrationSQL = fs.readFileSync(filePath, 'utf8');

  console.log(`🔄 Executing migration: ${migration.filename}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Execute migration SQL
    await client.query(migrationSQL);

    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (id, name, filename) VALUES ($1, $2, $3)',
      [migration.id, migration.name, migration.filename]
    );

    await client.query('COMMIT');
    console.log(`✅ Migration completed: ${migration.filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration failed: ${migration.filename}`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run pending migrations
 */
async function runMigrations(): Promise<void> {
  const pool = new Pool(dbConfig);

  try {
    console.log('🚀 Starting database migrations...');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Initialize migrations table
    await initializeMigrations(pool);

    // Get executed and available migrations
    const executedMigrations = await getExecutedMigrations(pool);
    const executedIds = new Set(executedMigrations.map(m => m.id));

    const availableMigrations = getAvailableMigrations();
    const pendingMigrations = availableMigrations.filter(m => !executedIds.has(m.id));

    console.log(`📊 Found ${pendingMigrations.length} pending migrations`);

    if (pendingMigrations.length === 0) {
      console.log('✨ Database is up to date!');
      return;
    }

    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(pool, migration);
    }

    console.log('✨ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  const pool = new Pool(dbConfig);

  try {
    await initializeMigrations(pool);

    const executedMigrations = await getExecutedMigrations(pool);
    const availableMigrations = getAvailableMigrations();

    console.log('\n📊 Migration Status:\n');

    availableMigrations.forEach(migration => {
      const executed = executedMigrations.find(m => m.id === migration.id);
      const status = executed ? '✅' : '⏳';
      const date = executed?.executed_at ?
        new Date(executed.executed_at).toLocaleString() : 'Pending';

      console.log(`${status} ${migration.filename} - ${date}`);
    });

    console.log(`\nTotal: ${executedMigrations.length}/${availableMigrations.length} migrations executed\n`);
  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Rollback last migration (use with caution!)
 */
async function rollback(): Promise<void> {
  console.log('⚠️  Rollback functionality not implemented yet');
  console.log('💡 Manual SQL rollback required for safety');
  process.exit(1);
}

// CLI interface
const command = process.argv[2] || 'up';

switch (command) {
  case 'up':
  case 'migrate':
    runMigrations();
    break;
  case 'status':
    showStatus();
    break;
  case 'rollback':
    rollback();
    break;
  default:
    console.log('Usage: npm run migrate [up|status|rollback]');
    console.log('  up, migrate   - Run pending migrations');
    console.log('  status        - Show migration status');
    console.log('  rollback      - Rollback last migration (not implemented)');
    process.exit(1);
}