/**
 * Database Connection Test Script
 * Run with: node scripts/test-db.js
 */

const { Pool } = require('pg');

require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing Neon Database Connection...');
  console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Connected to database successfully');

    // Test query
    const result = await client.query(`
      SELECT
        version() as postgres_version,
        current_database() as database_name,
        current_user as database_user,
        NOW() as current_time
    `);

    console.log('📊 Database Info:', result.rows[0]);

    // Test SECURITY DEFINER function
    const functionTest = await client.query(
      'SELECT * FROM create_or_update_user($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      ['test-uid-' + Date.now(), 'test_user_' + Date.now(), 'pioneer', 'customer', false, null, null, null, null, null]
    );

    console.log('✅ SECURITY DEFINER function works:', {
      user_id: functionTest.rows[0].id,
      username: functionTest.rows[0].pi_username
    });

    // Test RLS policies
    const rlsTest = await client.query(`
      SELECT
        schemaname || '.' || tablename as table_name,
        policyname as policy_name,
        permissive as is_permissive
      FROM pg_policies
      WHERE schemaname = 'public'
      LIMIT 5
    `);

    console.log('🔒 RLS Policies found:', rlsTest.rows.length);
    if (rlsTest.rows.length > 0) {
      console.log('Sample policies:', rlsTest.rows);
    }

    client.release();

    console.log('✅ All database tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();