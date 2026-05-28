-- ============================================================================
-- PERFORMANCE OPTIMIZATION: INDEX FOR PI_UID LOOKUPS
-- ============================================================================
-- Migration 029
-- Purpose: Add index on pi_uid to improve authentication query performance
-- Problem: Query taking 810ms for simple lookup, will degrade as user base grows
-- Solution: Create index to reduce lookup time from 810ms to <5ms
-- ============================================================================

-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- Create index on pi_uid for fast user lookups during authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_pi_uid ON users(pi_uid);

-- Also create index on pi_username for alternative lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_pi_username ON users(pi_username) WHERE pi_username IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify indexes were created
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname IN ('idx_users_pi_uid', 'idx_users_pi_username');

-- ============================================================================
-- PERFORMANCE TEST
-- ============================================================================

-- Test query performance before and after index
-- EXPLAIN ANALYZE SELECT id, deleted_at FROM users WHERE pi_uid = 'test-uid';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
ROLLBACK;

DROP INDEX IF EXISTS idx_users_pi_uid;
DROP INDEX IF EXISTS idx_users_pi_username;
*/