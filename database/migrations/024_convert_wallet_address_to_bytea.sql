-- ============================================================================
-- CONVERT PI_WALLET_ADDRESS TO BYTEA
-- ============================================================================
-- Migration 024
-- Purpose: Convert pi_wallet_address from VARCHAR to BYTEA for proper storage
--          and extract wallet address during Pi authentication
-- ============================================================================

BEGIN;

-- Step 1: Add a new bytea column for wallet address
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pi_wallet_address_bytea BYTEA;

-- Step 2: Migrate existing wallet addresses from VARCHAR to BYTEA
UPDATE users
SET pi_wallet_address_bytea = decode(pi_wallet_address, 'hex')
WHERE pi_wallet_address IS NOT NULL
  AND pi_wallet_address ~ '^[0-9a-fA-F]+$';

-- Step 3: Drop dependent objects that use pi_wallet_address
DROP VIEW IF EXISTS merchant_dashboard CASCADE;
DROP VIEW IF EXISTS low_inventory CASCADE;
DROP VIEW IF EXISTS universal_product_catalog CASCADE;
DROP VIEW IF EXISTS merchant_product_management CASCADE;
DROP VIEW IF EXISTS popular_products_catalog CASCADE;

-- Step 4: Drop the old VARCHAR column
ALTER TABLE users
DROP COLUMN IF EXISTS pi_wallet_address CASCADE;

-- Step 4: Rename the bytea column to pi_wallet_address
ALTER TABLE users
RENAME COLUMN pi_wallet_address_bytea TO pi_wallet_address;

-- Step 5: Add comment
COMMENT ON COLUMN users.pi_wallet_address IS 'Pi Network wallet address stored as bytea (hex format) for receiving A2U payments and cashback rewards';

-- Step 6: Update the index (expression-based index for bytea column)
DROP INDEX IF EXISTS idx_users_pi_wallet_address;
CREATE INDEX IF NOT EXISTS idx_users_pi_wallet_address ON users ((encode(pi_wallet_address, 'hex'))) WHERE pi_wallet_address IS NOT NULL;

-- Step 7: Recreate the views that were dropped
-- Merchant dashboard view
CREATE VIEW merchant_dashboard AS
SELECT
    m.id AS merchant_id,
    m.business_name,
    m.subscription_tier,
    COUNT(DISTINCT mp.id) AS total_products,
    COUNT(DISTINCT s.id) AS total_sales,
    COALESCE(SUM(s.total_amount), 0) AS total_revenue,
    COUNT(DISTINCT CASE WHEN s.transaction_date >= CURRENT_DATE - INTERVAL '30 days' THEN s.id END) AS sales_last_30_days,
    COUNT(DISTINCT CASE WHEN mi.current_stock <= mi.low_stock_threshold THEN mp.product_id END) AS low_stock_count
FROM merchants m
LEFT JOIN merchant_products mp ON m.id = mp.merchant_id AND mp.deleted_at IS NULL
LEFT JOIN merchant_inventory mi ON m.id = mi.merchant_id AND mp.product_id = mi.product_id
LEFT JOIN sales s ON m.id = s.merchant_id AND s.status = 'completed'
WHERE m.is_active = true
GROUP BY m.id, m.business_name, m.subscription_tier;

-- Low inventory view
CREATE VIEW low_inventory AS
SELECT
    mi.merchant_id,
    m.business_name,
    p.id AS product_id,
    p.name AS product_name,
    p.universal_sku,
    mp.merchant_sku,
    mi.current_stock,
    mi.low_stock_threshold,
    (mi.current_stock <= mi.low_stock_threshold) AS is_low_stock,
    mi.updated_at
FROM merchant_inventory mi
JOIN merchants m ON mi.merchant_id = m.id
JOIN products p ON mi.product_id = p.id
JOIN merchant_products mp ON mi.merchant_id = mp.merchant_id AND mi.product_id = mp.product_id
WHERE mp.track_inventory = true
    AND mi.current_stock <= mi.low_stock_threshold
ORDER BY mi.current_stock ASC;

-- Universal product catalog view
CREATE VIEW universal_product_catalog AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.description,
    p.universal_sku,
    p.barcode,
    p.category_id,
    p.main_image_url,
    p.status,
    COUNT(DISTINCT mp.merchant_id) AS merchant_count,
    MIN(mp.price) AS min_price,
    MAX(mp.price) AS max_price,
    ROUND(AVG(mp.price), 2) AS avg_price
FROM products p
LEFT JOIN merchant_products mp ON p.id = mp.product_id AND mp.deleted_at IS NULL
    AND mp.is_visible = true AND mp.status = 'active'
WHERE p.deleted_at IS NULL
    AND p.status = 'active'
GROUP BY p.id, p.name, p.description, p.universal_sku, p.barcode, p.category_id, p.main_image_url, p.status
HAVING COUNT(DISTINCT mp.merchant_id) > 0;

-- Merchant product management view
CREATE VIEW merchant_product_management AS
SELECT
    m.id AS merchant_id,
    m.business_name,
    p.id AS product_id,
    p.name AS product_name,
    p.universal_sku,
    p.barcode,
    mp.id AS merchant_product_id,
    mp.merchant_sku,
    mp.price,
    mp.is_visible,
    mp.status AS merchant_status,
    mi.current_stock,
    mi.low_stock_threshold,
    (mi.current_stock <= mi.low_stock_threshold) AS is_low_stock,
    CASE
        WHEN mp.product_id IS NULL THEN 'not_added'
        WHEN mi.current_stock = 0 THEN 'out_of_stock'
        WHEN mi.current_stock <= mi.low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
    END AS inventory_status
FROM merchants m
CROSS JOIN products p
LEFT JOIN merchant_products mp ON m.id = mp.merchant_id AND p.id = mp.product_id AND mp.deleted_at IS NULL
LEFT JOIN merchant_inventory mi ON m.id = mi.merchant_id AND p.id = mi.product_id
WHERE p.deleted_at IS NULL AND p.status = 'active'
    AND m.is_active = true;

-- Popular products view
CREATE VIEW popular_products_catalog AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.universal_sku,
    p.barcode,
    p.main_image_url,
    p.category_id,
    COUNT(DISTINCT s.merchant_id) AS sold_by_merchants,
    SUM(si.quantity) AS total_units_sold,
    SUM(si.total_price) AS total_revenue,
    COUNT(DISTINCT mp.merchant_id) AS available_from_merchants,
    MIN(mp.price) AS min_market_price,
    MAX(mp.price) AS max_market_price
FROM products p
JOIN sale_items si ON p.id = si.product_id
JOIN sales s ON si.sale_id = s.id AND s.status = 'completed'
LEFT JOIN merchant_products mp ON p.id = mp.product_id AND mp.is_visible = true
WHERE p.deleted_at IS NULL AND p.status = 'active'
    AND s.transaction_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY p.id, p.name, p.universal_sku, p.barcode, p.main_image_url, p.category_id
ORDER BY total_units_sold DESC
LIMIT 100;

-- Step 8: Update the create_or_update_user function to accept pi_wallet_address
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

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column is now bytea
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'pi_wallet_address';

-- Verify existing addresses were migrated
SELECT
  id,
  pi_username,
  encode(pi_wallet_address, 'hex') as wallet_address_hex
FROM users
WHERE pi_wallet_address IS NOT NULL
LIMIT 5;

-- Verify the function was updated
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_or_update_user'
AND routine_schema = 'public';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
ROLLBACK;

-- To rollback, convert back to VARCHAR:
ALTER TABLE users ADD COLUMN pi_wallet_address_varchar VARCHAR(255);
UPDATE users SET pi_wallet_address_varchar = encode(pi_wallet_address, 'hex');
ALTER TABLE users DROP COLUMN pi_wallet_address;
ALTER TABLE users RENAME COLUMN pi_wallet_address_varchar TO pi_wallet_address;
CREATE INDEX idx_users_pi_wallet_address ON users(pi_wallet_address) WHERE pi_wallet_address IS NOT NULL;
COMMENT ON COLUMN users.pi_wallet_address IS 'Pi Network wallet address for receiving A2U payments and cashback rewards';

-- Then restore the previous version of create_or_update_user from migration 006
*/