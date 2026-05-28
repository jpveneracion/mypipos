-- ============================================================================
-- ADD ENCRYPTED WALLET ADDRESS (FOLLOWS PII PATTERN)
-- ============================================================================
-- Migration 027
-- Purpose: Add encrypted wallet address following same pattern as other PII
-- Pattern: Store as BYTEA (encrypted), decrypt for display with decrypt_customer_pii()
-- Benefits: Secure encrypted storage, automatic extraction during Pi login
-- ============================================================================

BEGIN;

-- Step 1: Clean up dependent views
DROP VIEW IF EXISTS merchant_dashboard CASCADE;
DROP VIEW IF EXISTS low_inventory CASCADE;
DROP VIEW IF EXISTS universal_product_catalog CASCADE;
DROP VIEW IF EXISTS merchant_product_management CASCADE;
DROP VIEW IF EXISTS popular_products_catalog CASCADE;

-- Step 2: Clean up current wallet address column (if it exists in any format)
ALTER TABLE users DROP COLUMN IF EXISTS pi_wallet_address CASCADE;

-- Step 3: Add wallet address as BYTEA (encrypted storage like other PII)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pi_wallet_address BYTEA;

-- Step 6: Drop old functions before creating new ones
DROP FUNCTION IF EXISTS create_or_update_user(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) CASCADE;

DROP FUNCTION IF EXISTS get_user_account_settings(UUID) CASCADE;

DROP FUNCTION IF EXISTS update_personal_settings(UUID, VARCHAR, JSONB, TEXT, INET, TEXT) CASCADE;

DROP FUNCTION IF EXISTS get_user_full_wallet_address(UUID) CASCADE;

-- Step 7: Update the create_or_update_user function to encrypt wallet address like other PII
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

-- Step 8: Update settings functions to decrypt wallet address for display with truncation
CREATE OR REPLACE FUNCTION get_user_account_settings(p_user_id UUID)
RETURNS JSONB
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT jsonb_build_object(
        'personal', jsonb_build_object(
            'pi_wallet_address', CASE
                WHEN u.pi_wallet_address IS NOT NULL THEN
                    CONCAT(
                        SUBSTRING(decrypt_customer_pii(u.pi_wallet_address), 1, 5),
                        '...',
                        SUBSTRING(decrypt_customer_pii(u.pi_wallet_address),
                            LENGTH(decrypt_customer_pii(u.pi_wallet_address)) - 4)
                    )
                ELSE NULL
            END,
            'cashback_preferences', u.cashback_preferences,
            'payment_preferences', u.payment_preferences,
            'notification_preferences', u.notification_preferences,
            'saved_addresses', u.saved_addresses,
            'purchase_history_settings', u.purchase_history_settings
        ),
        'business', CASE
            WHEN u.merchant_id IS NOT NULL THEN
                jsonb_build_object(
                    'payment_methods', m.payment_methods,
                    'store_hours', m.store_hours,
                    'store_locations', m.store_locations,
                    'staff_permissions', m.staff_permissions,
                    'billing_info', m.billing_info,
                    'api_keys', m.api_keys,
                    'analytics_config', m.analytics_config
                )
            ELSE NULL
        END,
        'user_info', jsonb_build_object(
            'id', u.id,
            'username', u.username,
            'pi_username', u.pi_username,
            'email', CASE WHEN u.email IS NOT NULL THEN decrypt_customer_pii(u.email) ELSE NULL END,
            'first_name', CASE WHEN u.first_name IS NOT NULL THEN decrypt_customer_pii(u.first_name) ELSE NULL END,
            'last_name', CASE WHEN u.last_name IS NOT NULL THEN decrypt_customer_pii(u.last_name) ELSE NULL END,
            'phone', CASE WHEN u.phone IS NOT NULL THEN decrypt_customer_pii(u.phone) ELSE NULL END,
            'user_type', u.user_type,
            'role', u.role,
            'merchant_id', u.merchant_id
        )
    )
    FROM users u
    LEFT JOIN merchants m ON u.merchant_id = m.id
    WHERE u.id = p_user_id;
$$;

-- Step 9: Update update_personal_settings to handle encrypted wallet address
CREATE OR REPLACE FUNCTION update_personal_settings(
    p_user_id UUID,
    p_settings_field VARCHAR(100),
    p_new_value JSONB,
    p_change_reason TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_value JSONB;
    v_updated_value JSONB;
    v_wallet_address TEXT;
BEGIN
    -- Get current value
    CASE p_settings_field
        WHEN 'cashback_preferences' THEN
            SELECT cashback_preferences INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET cashback_preferences = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING cashback_preferences INTO v_updated_value;
        WHEN 'payment_preferences' THEN
            SELECT payment_preferences INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET payment_preferences = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING payment_preferences INTO v_updated_value;
        WHEN 'notification_preferences' THEN
            SELECT notification_preferences INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET notification_preferences = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING notification_preferences INTO v_updated_value;
        WHEN 'saved_addresses' THEN
            SELECT saved_addresses INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET saved_addresses = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING saved_addresses INTO v_updated_value;
        WHEN 'purchase_history_settings' THEN
            SELECT purchase_history_settings INTO v_old_value FROM users WHERE id = p_user_id;
            UPDATE users SET purchase_history_settings = p_new_value, updated_at = NOW() WHERE id = p_user_id RETURNING purchase_history_settings INTO v_updated_value;
        WHEN 'pi_wallet_address' THEN
            -- Handle pi_wallet_address separately as it's encrypted BYTEA not JSONB
            -- Decrypt old value for logging
            SELECT decrypt_customer_pii(pi_wallet_address) INTO v_wallet_address FROM users WHERE id = p_user_id;
            v_old_value := jsonb_build_object('pi_wallet_address', v_wallet_address);

            -- Encrypt and update the new value
            DECLARE
                v_new_address TEXT;
            BEGIN
                v_new_address := p_new_value->>'pi_wallet_address';

                IF v_new_address IS NOT NULL AND v_new_address != '' THEN
                    UPDATE users SET pi_wallet_address = encrypt_customer_pii(v_new_address), updated_at = NOW() WHERE id = p_user_id;

                    -- Decrypt new value for logging
                    SELECT decrypt_customer_pii(pi_wallet_address) INTO v_wallet_address FROM users WHERE id = p_user_id;
                    v_updated_value := jsonb_build_object('pi_wallet_address', v_wallet_address);
                ELSE
                    UPDATE users SET pi_wallet_address = NULL, updated_at = NOW() WHERE id = p_user_id;
                    v_updated_value := jsonb_build_object('pi_wallet_address', NULL);
                END IF;
            END;
        ELSE
            RAISE EXCEPTION 'Invalid personal settings field: %', p_settings_field;
    END CASE;

    -- Log the change
    INSERT INTO settings_audit_log (
        user_id, merchant_id, settings_type, field_changed,
        old_value, new_value, ip_address, user_agent, change_reason
    ) VALUES (
        p_user_id, NULL, 'personal', p_settings_field,
        v_old_value, v_updated_value, p_ip_address, p_user_agent, p_change_reason
    );

    RETURN v_updated_value;
END;
$$;

-- Step 10: Add function to get full wallet address for actual use (payments, etc.)
CREATE OR REPLACE FUNCTION get_user_full_wallet_address(p_user_id UUID)
RETURNS TEXT
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT decrypt_customer_pii(u.pi_wallet_address)
    FROM users u
    WHERE u.id = p_user_id AND u.pi_wallet_address IS NOT NULL;
$$;

-- Step 11: Recreate views that were dropped
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

-- Step 12: Add comments
COMMENT ON COLUMN users.pi_wallet_address IS 'Pi Network wallet address (encrypted as BYTEA) for receiving A2U payments and cashback rewards';
COMMENT ON FUNCTION get_user_full_wallet_address(UUID) IS 'Returns the full decrypted wallet address for actual use in payments and transactions';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column is BYTEA (encrypted storage)
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'pi_wallet_address';

-- Verify only one version of each function exists
SELECT
    routine_name,
    pg_get_function_arguments(oid) as arguments
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_or_update_user', 'get_user_account_settings', 'update_personal_settings', 'get_user_full_wallet_address')
ORDER BY routine_name;

-- Test wallet address display (should show truncated format)
-- SELECT get_user_account_settings('your-user-id-here');

-- Test full wallet address retrieval (should show full address)
-- SELECT get_user_full_wallet_address('your-user-id-here');

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
ROLLBACK;

-- To rollback, you would need to manually reverse these changes
*/