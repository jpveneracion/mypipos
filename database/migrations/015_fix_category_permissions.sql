-- ============================================================================
-- Migration 015: Fix permissions for universal_categories table
-- ============================================================================
-- This migration fixes the "permission denied for table universal_categories" error
-- The issue was that migration 013 didn't properly grant all necessary permissions
-- ============================================================================

BEGIN;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS universal_categories_select_policy ON universal_categories;
DROP POLICY IF EXISTS universal_categories_insert_policy ON universal_categories;
DROP POLICY IF EXISTS universal_categories_update_policy ON universal_categories;
DROP POLICY IF EXISTS universal_categories_delete_policy ON universal_categories;

-- Grant basic table permissions to mypipos_app
GRANT SELECT, INSERT, UPDATE, DELETE ON universal_categories TO mypipos_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mypipos_app;

-- Create RLS policies following migration 004 pattern (using USING with true)
CREATE POLICY universal_categories_select_policy ON universal_categories
    FOR SELECT
    TO mypipos_app
    USING (is_active = true);

CREATE POLICY universal_categories_insert_policy ON universal_categories
    FOR INSERT
    TO mypipos_app
    WITH CHECK (true);

CREATE POLICY universal_categories_update_policy ON universal_categories
    FOR UPDATE
    TO mypipos_app
    USING (true)
    WITH CHECK (true);

CREATE POLICY universal_categories_delete_policy ON universal_categories
    FOR DELETE
    TO mypipos_app
    USING (false);

-- Grant execute permission on the security function
GRANT EXECUTE ON FUNCTION create_category_if_not_exists TO mypipos_app;

-- Grant usage on the products_by_category view
GRANT SELECT ON products_by_category TO mypipos_app;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table permissions
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'universal_categories'
AND grantee = 'mypipos_app';

-- Check RLS policies
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'universal_categories'
AND schemaname = 'public';