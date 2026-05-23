-- ============================================================================
-- SECURITY DEFINER Functions for myPiPOS (Matching Actual Schema)
-- ============================================================================
-- These functions bypass RLS policies for necessary operations
-- Follows mypiroll enterprise security pattern
-- Run: psql "$DATABASE_URL" -f 006_security_definer_functions.sql
-- ============================================================================

BEGIN;

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_user_by_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_by_pi_uid(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS create_or_update_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_user_onboarding(UUID, VARCHAR, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_merchant(VARCHAR, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_merchant_by_id(UUID) CASCADE;

-- ============================================================================
-- USERS TABLE FUNCTIONS (Essential for Authentication)
-- ============================================================================

-- Get user by ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id UUID)
RETURNS users AS $$
  SET search_path = public;
  SELECT * FROM users WHERE id = p_user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get user by Pi UID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_by_pi_uid(p_pi_uid VARCHAR(255))
RETURNS users AS $$
  SET search_path = public;
  SELECT * FROM users WHERE pi_uid = p_pi_uid;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create or update user (bypasses RLS)
CREATE OR REPLACE FUNCTION create_or_update_user(
  p_pi_uid VARCHAR(255),
  p_pi_username VARCHAR(255),
  p_user_type VARCHAR(20) DEFAULT 'pioneer',
  p_role VARCHAR(50) DEFAULT 'customer',
  p_onboarding_complete BOOLEAN DEFAULT false,
  p_merchant_id UUID DEFAULT NULL
) RETURNS users AS $$
DECLARE
  v_existing_user users%ROWTYPE;
BEGIN
  SET search_path = public;

  -- Check if user exists
  SELECT * INTO v_existing_user FROM users WHERE pi_uid = p_pi_uid LIMIT 1;

  IF v_existing_user IS NOT NULL THEN
    -- Update existing user
    UPDATE users SET
      pi_username = p_pi_username,
      user_type = p_user_type,
      role = p_role,
      onboarding_complete = p_onboarding_complete,
      merchant_id = COALESCE(p_merchant_id, merchant_id),
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE pi_uid = p_pi_uid
    RETURNING * INTO v_existing_user;
  ELSE
    -- Create new user
    INSERT INTO users (
      pi_uid, pi_username, user_type, role, onboarding_complete,
      merchant_id, is_active, created_at, updated_at
    )
    VALUES (
      p_pi_uid, p_pi_username, p_user_type, p_role, p_onboarding_complete,
      p_merchant_id, true, NOW(), NOW()
    )
    RETURNING * INTO v_existing_user;
  END IF;

  RETURN v_existing_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete user onboarding (bypasses RLS)
CREATE OR REPLACE FUNCTION complete_user_onboarding(
  p_user_id UUID,
  p_user_type VARCHAR(20),
  p_role VARCHAR(50),
  p_merchant_id UUID DEFAULT NULL
) RETURNS users AS $$
DECLARE
  v_updated_user users%ROWTYPE;
BEGIN
  SET search_path = public;

  -- Update user with onboarding completion
  UPDATE users SET
    user_type = p_user_type,
    role = p_role,
    merchant_id = p_merchant_id,
    onboarding_complete = true,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_updated_user;

  RETURN v_updated_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MERCHANTS TABLE FUNCTIONS
-- ============================================================================

-- Create merchant (bypasses RLS)
CREATE OR REPLACE FUNCTION create_merchant(
  p_business_name VARCHAR(255),
  p_is_active BOOLEAN DEFAULT true
) RETURNS merchants AS $$
DECLARE
  v_merchant merchants%ROWTYPE;
BEGIN
  SET search_path = public;

  INSERT INTO merchants (business_name, is_active, created_at, updated_at)
  VALUES (p_business_name, p_is_active, NOW(), NOW())
  RETURNING * INTO v_merchant;

  RETURN v_merchant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get merchant by ID (bypasses RLS)
CREATE OR REPLACE FUNCTION get_merchant_by_id(p_merchant_id UUID)
RETURNS merchants AS $$
  SET search_path = public;
  SELECT * FROM merchants WHERE id = p_merchant_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION
  get_user_by_id,
  get_user_by_pi_uid,
  create_or_update_user,
  complete_user_onboarding,
  create_merchant,
  get_merchant_by_id
TO PUBLIC;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all SECURITY DEFINER functions we created
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  proargnames as argument_names
FROM pg_proc
WHERE prosecdef = true
AND proname LIKE ANY (ARRAY['%user%', '%merchant%'])
ORDER BY proname;