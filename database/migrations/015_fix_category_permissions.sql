-- ============================================================================
-- Migration 015: Fix permissions for universal_categories table
-- ============================================================================
-- This migration fixes the "permission denied for table universal_categories" error
-- The issue was that migration 013 didn't properly grant all necessary permissions
-- Also recreates the missing create_category_if_not_exists function
-- ============================================================================

BEGIN;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS universal_categories_select_policy ON universal_categories;
DROP POLICY IF EXISTS universal_categories_insert_policy ON universal_categories;
DROP POLICY IF EXISTS universal_categories_update_policy ON universal_categories;
DROP POLICY IF EXISTS universal_categories_delete_policy ON universal_categories;

-- Create the security definer function (if it doesn't exist)
CREATE OR REPLACE FUNCTION create_category_if_not_exists(
    p_name VARCHAR(100),
    p_slug VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_icon VARCHAR(50) DEFAULT NULL,
    p_color VARCHAR(20) DEFAULT NULL
) RETURNS universal_categories
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO universal_categories (name, slug, description, icon, color, display_order)
  VALUES (
    p_name,
    p_slug,
    p_description,
    p_icon,
    p_color,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM universal_categories)
  )
  ON CONFLICT (name) DO UPDATE SET
    name = EXCLUDED.name
  RETURNING *;
$$;

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

-- Grant usage on the products_by_category view (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'products_by_category') THEN
        GRANT SELECT ON products_by_category TO mypipos_app;
    END IF;
END
$$;

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

-- Check function exists
SELECT
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'create_category_if_not_exists';