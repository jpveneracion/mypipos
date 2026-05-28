-- ============================================================================
-- CLEANUP DUPLICATE FUNCTIONS (FIX MIGRATION 27 ISSUES)
-- ============================================================================
-- Migration 028
-- Purpose: Remove all create_or_update_user functions and recreate properly
-- ============================================================================

BEGIN;

-- Step 1: Drop ALL versions of create_or_update_user function by argument list
-- Drop 10-parameter version (without wallet address)
DROP FUNCTION IF EXISTS create_or_update_user(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) CASCADE;

-- Drop 11-parameter version with VARCHAR wallet address
DROP FUNCTION IF EXISTS create_or_update_user(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) CASCADE;

-- Drop 11-parameter version with BYTEA wallet address (from migration 24/25)
DROP FUNCTION IF EXISTS create_or_update_user(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BYTEA
) CASCADE;

-- Step 2: Recreate the function with wallet address support
CREATE FUNCTION create_or_update_user(
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
  p_pi_wallet_address VARCHAR(255) DEFAULT NULL
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
    -- Encrypt plaintext input before storing (wallet address is PII too)
    CASE WHEN p_email IS NOT NULL THEN encrypt_customer_pii(p_email) ELSE NULL END,
    CASE WHEN p_phone IS NOT NULL THEN encrypt_customer_pii(p_phone) ELSE NULL END,
    CASE WHEN p_first_name IS NOT NULL THEN encrypt_customer_pii(p_first_name) ELSE NULL END,
    CASE WHEN p_last_name IS NOT NULL THEN encrypt_customer_pii(p_last_name) ELSE NULL END,
    CASE WHEN p_pi_wallet_address IS NOT NULL THEN encrypt_customer_pii(p_pi_wallet_address) ELSE NULL END,
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

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify only ONE function exists (using PostgreSQL catalog)
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_or_update_user';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
ROLLBACK;
*/