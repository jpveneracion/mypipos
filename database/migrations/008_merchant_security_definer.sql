-- ============================================================================
-- SECURITY DEFINER functions for merchants table
-- Run on Neon to fix RLS violations during onboarding
-- ============================================================================

BEGIN;

-- Create merchant function
CREATE OR REPLACE FUNCTION create_merchant(
  p_id UUID,
  p_business_name VARCHAR(255),
  p_is_active BOOLEAN DEFAULT true
) RETURNS merchants
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO merchants (id, business_name, is_active, created_at, updated_at)
  VALUES (p_id, p_business_name, p_is_active, NOW(), NOW())
  RETURNING *;
$$;

GRANT EXECUTE ON FUNCTION create_merchant TO PUBLIC;

COMMIT;

-- Verify
SELECT
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'create_merchant';
