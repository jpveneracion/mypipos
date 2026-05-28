-- ============================================================================
-- CLEANUP DUPLICATE FUNCTIONS AND COMPLETE WALLET ADDRESS IMPLEMENTATION
-- ============================================================================
-- Migration 026
-- Purpose: Clean up duplicate create_or_update_user functions and ensure proper implementation
-- ============================================================================

BEGIN;

-- Step 1: Drop the old version of create_or_update_user (without wallet address parameter)
-- The new version with p_pi_wallet_address bytea parameter should already exist
-- Note: Cannot use DEFAULT values when dropping functions, only parameter types
DROP FUNCTION IF EXISTS create_or_update_user(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) CASCADE;

-- Step 2: Ensure the correct version exists (with wallet address parameter)
CREATE OR REPLACE FUNCTION create_or_update_user(
  p_pi_uid VARCHAR(255),
  p_pi_username VARCHAR(255),
  p_user_type VARCHAR(20) DEFAULT 'pioneer',
  p_role VARCHAR(50) DEFAULT 'customer',
  p_onboarding_complete BOOLEAN DEFAULT NULL,
  p_merchant_id UUID DEFAULT NULL,
  p_email VARCHAR(255) DEFAULT NULL,
  p_phone VARCHAR(20) DEFAULT NULL,
  p_first_name VARCHAR(100) DEFAULT NULL,
  p_last_name VARCHAR(100) DEFAULT NULL,
  p_pi_wallet_address BYTEA DEFAULT NULL
) RETURNS users
SET search_path = public
SECURITY DEFINER
LANGUAGE PLPGSQL
AS $$
  DECLARE
    v_result users;
  BEGIN
  INSERT INTO users (
    pi_uid, pi_username, user_type, role, onboarding_complete,
    merchant_id, email, phone, first_name, last_name, pi_wallet_address,
    is_active, created_at, updated_at
  )
  VALUES (
    p_pi_uid, p_pi_username, p_user_type, p_role, COALESCE(p_onboarding_complete, false),
    p_merchant_id,
    -- Encrypt plaintext input before storing
    CASE WHEN p_email IS NOT NULL THEN encrypt_customer_pii(p_email) ELSE NULL END,
    CASE WHEN p_phone IS NOT NULL THEN encrypt_customer_pii(p_phone) ELSE NULL END,
    CASE WHEN p_first_name IS NOT NULL THEN encrypt_customer_pii(p_first_name) ELSE NULL END,
    CASE WHEN p_last_name IS NOT NULL THEN encrypt_customer_pii(p_last_name) ELSE NULL END,
    p_pi_wallet_address,
    true, NOW(), NOW()
  )
  ON CONFLICT (pi_uid) DO UPDATE SET
    pi_username = EXCLUDED.pi_username,
    user_type = EXCLUDED.user_type,
    role = EXCLUDED.role,
    -- IMPORTANT: Don't update onboarding_complete during login
    -- It's only set during INSERT (for new users) or by complete_user_onboarding()
    merchant_id = COALESCE(EXCLUDED.merchant_id, users.merchant_id),
    email = COALESCE(EXCLUDED.email, users.email),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    pi_wallet_address = COALESCE(EXCLUDED.pi_wallet_address, users.pi_wallet_address),
    last_login_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
  END;
$$;

-- Step 3: Verify only one version exists
COMMENT ON FUNCTION create_or_update_user(
  p_pi_uid VARCHAR(255),
  p_pi_username VARCHAR(255),
  p_user_type VARCHAR(20),
  p_role VARCHAR(50),
  p_onboarding_complete BOOLEAN,
  p_merchant_id UUID,
  p_email VARCHAR(255),
  p_phone VARCHAR(20),
  p_first_name VARCHAR(100),
  p_last_name VARCHAR(100),
  p_pi_wallet_address BYTEA
) IS 'Creates or updates a user record with Pi Network authentication data, including optional wallet address in bytea format';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify only one function exists
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_or_update_user';

-- Test the function works (optional)
-- SELECT * FROM create_or_update_user('test-cleanup-user', 'testuser', 'pioneer', 'customer', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
ROLLBACK;

-- This would remove both functions, so you'd need to recreate the correct one from migration 024
*/