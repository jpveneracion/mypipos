-- ============================================================================
-- CUSTOMER DATA ENCRYPTION
-- ============================================================================
-- Encrypts customer PII using PostgreSQL pgcrypto
-- Columns are named normally (email, phone, etc.) but contain encrypted data
-- ============================================================================

BEGIN;

-- WARNING: This migration uses a hardcoded development encryption key
-- In production, replace this function to fetch keys from a secure key management system
-- DO NOT deploy this migration as-is to production environments

-- ============================================================================
-- STEP 1: Clean up dependent objects first
-- ============================================================================

-- Drop views that depend on the columns we need to modify
DROP VIEW IF EXISTS users_decrypted CASCADE;

-- ============================================================================
-- STEP 2: Clean up existing columns (both plaintext and encrypted versions)
-- ============================================================================

-- Drop any existing plaintext columns
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;

-- Drop any existing _encrypted suffix columns from previous migration attempts
ALTER TABLE users DROP COLUMN IF EXISTS email_encrypted;
ALTER TABLE users DROP COLUMN IF EXISTS phone_encrypted;
ALTER TABLE users DROP COLUMN IF EXISTS first_name_encrypted;
ALTER TABLE users DROP COLUMN IF EXISTS last_name_encrypted;

-- Drop any existing hash columns from previous attempts
ALTER TABLE users DROP COLUMN IF EXISTS email_hash;
ALTER TABLE users DROP COLUMN IF EXISTS email_hash_new;

-- ============================================================================
-- STEP 2: Add columns (will contain encrypted data)
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name BYTEA;

-- Create index on email hash for secure lookups
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

-- ============================================================================
-- ENCRYPTION/DECRYPTION FUNCTIONS
-- ============================================================================

-- Get or create master encryption key for customer data
-- SECURITY WARNING: This returns a hardcoded development key
-- In production, replace this to fetch from a secure key management system
CREATE OR REPLACE FUNCTION get_customer_encryption_key()
RETURNS TEXT
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  -- DO NOT USE THIS KEY IN PRODUCTION
  -- Replace with environment variables or key management service
  SELECT 'my-pipos-dev-key-change-in-production-12345'::TEXT;
$$;

-- Encrypt customer PII
CREATE OR REPLACE FUNCTION encrypt_customer_pii(p_data TEXT)
RETURNS BYTEA
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT pgp_sym_encrypt(p_data, get_customer_encryption_key());
$$;

-- Decrypt customer PII
CREATE OR REPLACE FUNCTION decrypt_customer_pii(p_encrypted_data BYTEA)
RETURNS TEXT
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT pgp_sym_decrypt(p_encrypted_data, get_customer_encryption_key());
$$;

-- Hash email for secure lookups
CREATE OR REPLACE FUNCTION hash_email(p_email VARCHAR(255))
RETURNS VARCHAR(64)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT encode(digest(p_email, 'sha256'), 'hex');
$$;

-- ============================================================================
-- UPDATE CREATE_OR_UPDATE_USER TO HANDLE ENCRYPTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_or_update_user(
  p_pi_uid VARCHAR(255),
  p_pi_username VARCHAR(255),
  p_user_type VARCHAR(20) DEFAULT 'pioneer',
  p_role VARCHAR(50) DEFAULT 'customer',
  p_onboarding_complete BOOLEAN DEFAULT false,
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
    p_pi_uid, p_pi_username, p_user_type, p_role, p_onboarding_complete,
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
    onboarding_complete = EXCLUDED.onboarding_complete,
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

-- ============================================================================
-- VIEWS FOR DECRYPTED DATA (authorized access only)
-- ============================================================================

-- SECURITY WARNING: This view exposes decrypted PII to anyone with SELECT permissions
-- In production, either:
-- 1. Remove this view entirely
-- 2. Add row-level security policies
-- 3. Create separate SECURITY DEFINER functions for authorized access only

-- Create a view that exposes decrypted customer data
CREATE VIEW users_decrypted AS
SELECT
  id,
  merchant_id,
  user_type,
  role,
  pi_uid,
  pi_username,
  -- Decrypt PII - columns contain encrypted data, this view provides decrypted access
  decrypt_customer_pii(email) as email,
  decrypt_customer_pii(phone) as phone,
  decrypt_customer_pii(first_name) as first_name,
  decrypt_customer_pii(last_name) as last_name,
  email_hash,
  username,
  customer_preferences,
  loyalty_points,
  total_purchases,
  is_active,
  is_verified,
  last_login_at,
  created_at,
  updated_at
FROM users;

-- Grant access to authorized roles only (adjust role names as needed)
-- GRANT SELECT ON users_decrypted TO app_admin_role;
-- REVOKE SELECT ON users_decrypted FROM public;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that PII columns exist and are BYTEA type (encrypted storage)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('email', 'phone', 'first_name', 'last_name', 'email_hash')
ORDER BY column_name;

-- Verify the columns are BYTEA (encrypted) not VARCHAR/TEXT (plaintext)
SELECT
  COUNT(*) as plaintext_columns_remaining
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('email', 'phone', 'first_name', 'last_name')
AND data_type IN ('character varying', 'text', 'varchar');

-- ============================================================================
-- PRODUCTION DEPLOYMENT CHECKLIST
-- ============================================================================
-- Before deploying this migration to production:
--
-- 1. Replace the hardcoded encryption key in get_customer_encryption_key()
--    with a secure key management system (AWS KMS, Azure Key Vault, etc.)
--
-- 2. Test the migration on a staging database first
--    - Verify columns are created as BYTEA (encrypted storage)
--    - Test encryption/decryption functions work correctly
--    - Ensure application code works with encrypted columns
--
-- 3. Update application code to:
--    - Continue passing plaintext to functions (create_or_update_user, etc.)
--    - Use users_decrypted view or decryption functions when reading PII
--    - Never expect to read plaintext directly from users table
--
-- 4. Either remove the users_decrypted view or add proper access controls:
--    - Row-level security policies
--    - Role-based permissions
--    - Application-level access controls
--
-- 5. Set up key rotation procedures for the encryption key
--
-- 6. Test backup/restore procedures with encrypted data
--
-- 7. Conduct a security review of the encryption implementation
--
-- 8. Ensure monitoring is in place for encryption/decryption failures
--
-- 9. Document that email/phone/name columns contain encrypted BYTEA data,
--    not plaintext TEXT/VARCHAR, for future developers
-- ============================================================================
