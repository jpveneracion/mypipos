-- ============================================================================
-- FIX ONBOARDING COMPLETE PRESERVATION
-- ============================================================================
-- Migration 006
-- Problem: onboarding_complete was being overwritten during login
-- Solution: Remove it from UPDATE clause so existing users keep their status
-- ============================================================================

BEGIN;

-- Update create_or_update_user to not overwrite onboarding_complete during login
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
  p_last_name VARCHAR(100) DEFAULT NULL
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
    merchant_id, email, phone, first_name, last_name,
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

-- Verify the function exists and has the correct logic
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_or_update_user'
AND routine_schema = 'public';

-- Test that function works correctly
-- This should create a new user with onboarding_complete = false
-- SELECT * FROM create_or_update_user('test-new-user', 'testuser', 'pioneer', 'customer', NULL, NULL, NULL, NULL, NULL, NULL);

-- This should update existing user without changing onboarding_complete
-- SELECT * FROM create_or_update_user('existing-user-uid', 'existinguser', 'pioneer', 'customer', NULL, NULL, NULL, NULL, NULL, NULL);

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration, run the original function from migration 005
-- or use: DROP FUNCTION create_or_update_user CASCADE;
-- Then re-run migration 005_customer_data_encryption.sql
-- ============================================================================