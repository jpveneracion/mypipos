-- Add onboarding columns and SECURITY DEFINER functions
-- Run: psql "$DATABASE_URL" -f 004_add_onboarding_fields.sql

BEGIN;

-- Add missing onboarding columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- SECURITY DEFINER Functions (bypass RLS policies)
DROP FUNCTION IF EXISTS create_or_update_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_user_onboarding(UUID, VARCHAR, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS create_merchant(VARCHAR, BOOLEAN) CASCADE;

-- Create or update user (handles duplicates)
CREATE OR REPLACE FUNCTION create_or_update_user(
  p_pi_uid VARCHAR,
  p_pi_username VARCHAR,
  p_user_type VARCHAR DEFAULT 'pioneer',
  p_role VARCHAR DEFAULT 'customer',
  p_onboarding_complete BOOLEAN DEFAULT false,
  p_merchant_id UUID DEFAULT NULL
) RETURNS users AS $$
DECLARE
  v_existing_user users%ROWTYPE;
  v_result users%ROWTYPE;
BEGIN
  SET search_path = public;

  SELECT * INTO v_existing_user FROM users WHERE pi_uid = p_pi_uid LIMIT 1;

  IF v_existing_user IS NOT NULL THEN
    UPDATE users SET
      pi_username = p_pi_username,
      user_type = p_user_type,
      role = p_role,
      onboarding_complete = p_onboarding_complete,
      merchant_id = COALESCE(p_merchant_id, users.merchant_id),
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE pi_uid = p_pi_uid
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO users (pi_uid, pi_username, user_type, role, onboarding_complete, merchant_id, is_active, created_at, updated_at)
    VALUES (p_pi_uid, p_pi_username, p_user_type, p_role, p_onboarding_complete, p_merchant_id, true, NOW(), NOW())
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete user onboarding
CREATE OR REPLACE FUNCTION complete_user_onboarding(
  p_user_id UUID,
  p_user_type VARCHAR,
  p_role VARCHAR,
  p_merchant_id UUID DEFAULT NULL
) RETURNS users AS $$
DECLARE
  v_updated_user users%ROWTYPE;
BEGIN
  SET search_path = public;

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

-- Create merchant
CREATE OR REPLACE FUNCTION create_merchant(p_business_name VARCHAR, p_is_active BOOLEAN DEFAULT true)
RETURNS merchants AS $$
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

GRANT EXECUTE ON FUNCTION create_or_update_user, complete_user_onboarding, create_merchant TO PUBLIC;

COMMIT;