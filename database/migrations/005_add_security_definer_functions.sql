-- Create SECURITY DEFINER functions for user operations
-- These functions bypass RLS policies for user creation/updates
-- Run: psql "$DATABASE_URL" -f 005_add_security_definer_functions.sql

BEGIN;

-- Function to create or update user (bypasses RLS)
CREATE OR REPLACE FUNCTION create_or_update_user(
  p_pi_uid VARCHAR(255),
  p_pi_username VARCHAR(255),
  p_user_type VARCHAR(20) DEFAULT 'pioneer',
  p_role VARCHAR(50) DEFAULT 'customer',
  p_onboarding_complete BOOLEAN DEFAULT false,
  p_merchant_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_existing_user users%ROWTYPE;
BEGIN
  -- Check if user exists
  SELECT * INTO v_existing_user
  FROM users
  WHERE pi_uid = p_pi_uid
  LIMIT 1;

  IF v_existing_user IS NOT NULL THEN
    -- Update existing user
    UPDATE users
    SET
      pi_username = p_pi_username,
      user_type = p_user_type,
      role = p_role,
      onboarding_complete = p_onboarding_complete,
      merchant_id = COALESCE(p_merchant_id, merchant_id),
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE pi_uid = p_pi_uid
    RETURNING id INTO v_user_id;
  ELSE
    -- Create new user
    INSERT INTO users (
      pi_uid,
      pi_username,
      user_type,
      role,
      onboarding_complete,
      merchant_id,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      p_pi_uid,
      p_pi_username,
      p_user_type,
      p_role,
      p_onboarding_complete,
      p_merchant_id,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to public (can be restricted later)
GRANT EXECUTE ON FUNCTION create_or_update_user TO PUBLIC;

-- Function to complete user onboarding (bypasses RLS)
CREATE OR REPLACE FUNCTION complete_user_onboarding(
  p_user_id UUID,
  p_user_type VARCHAR(20),
  p_role VARCHAR(50),
  p_merchant_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_updated_user users%ROWTYPE;
BEGIN
  -- Update user with onboarding completion
  UPDATE users
  SET
    user_type = p_user_type,
    role = p_role,
    merchant_id = p_merchant_id,
    onboarding_complete = true,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_updated_user;

  RETURN row_to_json(v_updated_user);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION complete_user_onboarding TO PUBLIC;

COMMIT;

-- Test the functions
SELECT create_or_update_user(
  'test-pi-uid-123',
  'testuser',
  'pioneer',
  'customer',
  false,
  NULL
);