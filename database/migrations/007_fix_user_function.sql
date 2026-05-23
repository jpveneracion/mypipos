-- ============================================================================
-- Fix create_or_update_user SECURITY DEFINER function
-- Run this directly on Neon to fix the broken function
-- ============================================================================

BEGIN;

-- Drop the broken function and all variants
DROP FUNCTION IF EXISTS create_or_update_user CASCADE;
DROP FUNCTION IF EXISTS create_or_update_user_impl CASCADE;
DROP FUNCTION IF EXISTS create_or_replace_user CASCADE;

-- Create the correct function using pure SQL approach
CREATE OR REPLACE FUNCTION create_or_update_user(
  p_pi_uid VARCHAR(255),
  p_pi_username VARCHAR(255),
  p_user_type VARCHAR(20) DEFAULT 'pioneer',
  p_role VARCHAR(50) DEFAULT 'customer',
  p_onboarding_complete BOOLEAN DEFAULT false,
  p_merchant_id UUID DEFAULT NULL
) RETURNS users
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO users (
    pi_uid, pi_username, user_type, role, onboarding_complete,
    merchant_id, is_active, created_at, updated_at
  )
  VALUES (
    p_pi_uid, p_pi_username, p_user_type, p_role, p_onboarding_complete,
    p_merchant_id, true, NOW(), NOW()
  )
  ON CONFLICT (pi_uid) DO UPDATE SET
    pi_username = EXCLUDED.pi_username,
    user_type = EXCLUDED.user_type,
    role = EXCLUDED.role,
    onboarding_complete = EXCLUDED.onboarding_complete,
    merchant_id = COALESCE(EXCLUDED.merchant_id, users.merchant_id),
    last_login_at = NOW(),
    updated_at = NOW()
  RETURNING *;
$$;

GRANT EXECUTE ON FUNCTION create_or_update_user TO PUBLIC;

COMMIT;

-- Verify function creation
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'create_or_update_user';
