-- ============================================================================
-- COMPLETE SECURITY MIGRATION (Working Version)
-- ============================================================================
-- This migration creates SECURITY DEFINER functions and RLS policies
-- All operations use IF NOT EXISTS for idempotency
-- ============================================================================

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECURITY ROLES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mypipos_app') THEN
        CREATE ROLE mypipos_app;
    END IF;
END
$$;

-- Grant basic usage to mypipos_app
GRANT USAGE ON SCHEMA public TO mypipos_app;

-- ============================================================================
-- USERS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_by_id(p_user_id UUID)
RETURNS users
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM users WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION get_user_by_pi_uid(p_pi_uid VARCHAR(255))
RETURNS users
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM users WHERE pi_uid = p_pi_uid;
$$;

-- Note: create_or_update_user function moved to migration 005
-- This migration now only includes the basic SECURITY DEFINER functions
-- The enhanced create_or_update_user with customer PII fields is in 005

CREATE OR REPLACE FUNCTION complete_user_onboarding(
  p_user_id UUID,
  p_user_type VARCHAR(20),
  p_role VARCHAR(50),
  p_merchant_id UUID DEFAULT NULL
) RETURNS users
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  UPDATE users SET
    user_type = p_user_type,
    role = p_role,
    merchant_id = p_merchant_id,
    onboarding_complete = true,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING *;
$$;

-- ============================================================================
-- MERCHANTS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_merchant_by_id(p_merchant_id UUID)
RETURNS merchants
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM merchants WHERE id = p_merchant_id;
$$;

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
  ON CONFLICT (id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION update_merchant(
  p_merchant_id UUID,
  p_business_name VARCHAR(255) DEFAULT NULL,
  p_business_type VARCHAR(100) DEFAULT NULL,
  p_phone VARCHAR(20) DEFAULT NULL,
  p_email VARCHAR(255) DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
) RETURNS merchants
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  UPDATE merchants SET
    business_name = COALESCE(p_business_name, business_name),
    business_type = COALESCE(p_business_type, business_type),
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, email),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_merchant_id
  RETURNING *;
$$;

-- ============================================================================
-- PRODUCTS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_by_id(p_product_id UUID)
RETURNS products
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM products WHERE id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION create_product(
  p_name VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_universal_sku VARCHAR(100) DEFAULT NULL,
  p_barcode VARCHAR(100) DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'active'
) RETURNS products
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO products (name, description, universal_sku, barcode, category_id, status, created_at, updated_at)
  VALUES (p_name, p_description, p_universal_sku, p_barcode, p_category_id, p_status, NOW(), NOW())
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION update_product(
  p_product_id UUID,
  p_name VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT NULL
) RETURNS products
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  UPDATE products SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_product_id
  RETURNING *;
$$;

-- ============================================================================
-- MERCHANT PRODUCTS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_merchant_product(
  p_merchant_id UUID,
  p_product_id UUID,
  p_merchant_sku VARCHAR(100),
  p_price DECIMAL(10,2),
  p_cost DECIMAL(10,2) DEFAULT NULL,
  p_is_visible BOOLEAN DEFAULT true,
  p_status VARCHAR(20) DEFAULT 'active'
) RETURNS merchant_products
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO merchant_products (
    merchant_id, product_id, merchant_sku, price, cost, is_visible, status, created_at, updated_at
  )
  VALUES (p_merchant_id, p_product_id, p_merchant_sku, p_price, p_cost, p_is_visible, p_status, NOW(), NOW())
  ON CONFLICT (merchant_id, product_id) DO UPDATE SET
    merchant_sku = EXCLUDED.merchant_sku,
    price = EXCLUDED.price,
    cost = EXCLUDED.cost,
    is_visible = EXCLUDED.is_visible,
    status = EXCLUDED.status,
    updated_at = NOW()
  RETURNING *;
$$;

-- ============================================================================
-- MERCHANT INVENTORY TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory(p_merchant_id UUID, p_product_id UUID)
RETURNS merchant_inventory
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM merchant_inventory WHERE merchant_id = p_merchant_id AND product_id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION upsert_inventory(
  p_merchant_id UUID,
  p_product_id UUID,
  p_current_stock INTEGER DEFAULT 0,
  p_low_stock_threshold INTEGER DEFAULT 10,
  p_reorder_quantity INTEGER DEFAULT 20
) RETURNS merchant_inventory
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO merchant_inventory (
    merchant_id, product_id, current_stock, low_stock_threshold, reorder_quantity, created_at, updated_at
  )
  VALUES (p_merchant_id, p_product_id, p_current_stock, p_low_stock_threshold, p_reorder_quantity, NOW(), NOW())
  ON CONFLICT (merchant_id, product_id) DO UPDATE SET
    current_stock = EXCLUDED.current_stock,
    low_stock_threshold = EXCLUDED.low_stock_threshold,
    reorder_quantity = EXCLUDED.reorder_quantity,
    updated_at = NOW()
  RETURNING *;
$$;

-- ============================================================================
-- CATEGORIES TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_category(
  p_merchant_id UUID,
  p_name VARCHAR(255),
  p_parent_id UUID DEFAULT NULL,
  p_is_visible BOOLEAN DEFAULT true
) RETURNS categories
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO categories (merchant_id, name, parent_id, is_visible, created_at, updated_at)
  VALUES (p_merchant_id, p_name, p_parent_id, p_is_visible, NOW(), NOW())
  RETURNING *;
$$;

-- ============================================================================
-- SALES TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_sale(
  p_merchant_id UUID,
  p_transaction_number VARCHAR(100),
  p_subtotal DECIMAL(15,2),
  p_total_amount DECIMAL(15,2),
  p_payment_method VARCHAR(50),
  p_customer_id UUID DEFAULT NULL,
  p_tax_amount DECIMAL(15,2) DEFAULT 0.00,
  p_discount_amount DECIMAL(15,2) DEFAULT 0.00,
  p_cashier_id UUID DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'completed'
) RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO sales (
    merchant_id, customer_id, transaction_number, subtotal, tax_amount,
    discount_amount, total_amount, payment_method, cashier_id, status,
    transaction_date, created_at, updated_at, completed_at
  )
  VALUES (
    p_merchant_id, p_customer_id, p_transaction_number, p_subtotal, p_tax_amount,
    p_discount_amount, p_total_amount, p_payment_method, p_cashier_id, p_status,
    NOW(), NOW(), NOW(), NOW()
  )
  RETURNING *;
$$;

-- ============================================================================
-- SALE ITEMS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_sale_item(
  p_sale_id UUID,
  p_merchant_id UUID,
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_unit_price DECIMAL(10,2),
  p_total_price DECIMAL(10,2),
  p_product_id UUID DEFAULT NULL,
  p_universal_sku VARCHAR(100) DEFAULT NULL,
  p_merchant_sku VARCHAR(100) DEFAULT NULL,
  p_discount_amount DECIMAL(10,2) DEFAULT 0.00,
  p_tax_amount DECIMAL(10,2) DEFAULT 0.00
) RETURNS sale_items
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO sale_items (
    sale_id, merchant_id, product_id, product_name, universal_sku, merchant_sku,
    quantity, unit_price, discount_amount, tax_amount, total_price, created_at
  )
  VALUES (
    p_sale_id, p_merchant_id, p_product_id, p_product_name, p_universal_sku, p_merchant_sku,
    p_quantity, p_unit_price, p_discount_amount, p_tax_amount, p_total_price, NOW()
  )
  RETURNING *;
$$;

-- ============================================================================
-- INVENTORY TRANSACTIONS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_inventory_transaction(
  p_merchant_id UUID,
  p_product_id UUID,
  p_transaction_type VARCHAR(20),
  p_quantity INTEGER,
  p_quantity_before INTEGER,
  p_quantity_after INTEGER,
  p_performed_by UUID DEFAULT NULL,
  p_reason VARCHAR(255) DEFAULT NULL
) RETURNS inventory_transactions
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO inventory_transactions (
    merchant_id, product_id, transaction_type, quantity,
    quantity_before, quantity_after, performed_by, reason,
    transaction_date, created_at
  )
  VALUES (
    p_merchant_id, p_product_id, p_transaction_type, p_quantity,
    p_quantity_before, p_quantity_after, p_performed_by, p_reason,
    NOW(), NOW()
  )
  RETURNING *;
$$;

-- ============================================================================
-- SESSIONS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_session(
  p_user_id UUID,
  p_token VARCHAR(500),
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_merchant_id UUID DEFAULT NULL,
  p_refresh_token VARCHAR(500) DEFAULT NULL
) RETURNS sessions
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO sessions (user_id, token, expires_at, merchant_id, refresh_token, created_at, last_activity_at)
  VALUES (p_user_id, p_token, p_expires_at, p_merchant_id, p_refresh_token, NOW(), NOW())
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION get_active_session(p_token VARCHAR(500))
RETURNS sessions
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sessions WHERE token = p_token AND is_active = true AND expires_at > NOW();
$$;

-- ============================================================================
-- AUDIT LOGS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_audit_log(
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_merchant_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS audit_logs
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO audit_logs (
    merchant_id, user_id, action, entity_type, entity_id,
    old_values, new_values, ip_address, user_agent, created_at
  )
  VALUES (
    p_merchant_id, p_user_id, p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_ip_address, p_user_agent, NOW()
  )
  RETURNING *;
$$;

-- ============================================================================
-- MERCHANT SETTINGS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_merchant_setting(
  p_merchant_id UUID,
  p_setting_category VARCHAR(50),
  p_setting_key VARCHAR(100),
  p_setting_value TEXT DEFAULT NULL,
  p_is_encrypted BOOLEAN DEFAULT false
) RETURNS merchant_settings
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO merchant_settings (
    merchant_id, setting_category, setting_key, setting_value, is_encrypted, created_at, updated_at
  )
  VALUES (p_merchant_id, p_setting_category, p_setting_key, p_setting_value, p_is_encrypted, NOW(), NOW())
  ON CONFLICT (merchant_id, setting_category, setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    is_encrypted = EXCLUDED.is_encrypted,
    updated_at = NOW()
  RETURNING *;
$$;

-- ============================================================================
-- WEBHOOKS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_webhook(
  p_merchant_id UUID,
  p_name VARCHAR(255),
  p_endpoint_url VARCHAR(500),
  p_events TEXT[],
  p_secret_key VARCHAR(255) DEFAULT NULL,
  p_auth_type VARCHAR(20) DEFAULT 'header'
) RETURNS webhooks
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO webhooks (
    merchant_id, name, endpoint_url, events, secret_key, auth_type, created_at, updated_at
  )
  VALUES (p_merchant_id, p_name, p_endpoint_url, p_events, p_secret_key, p_auth_type, NOW(), NOW())
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION create_webhook_log(
  p_webhook_id UUID,
  p_merchant_id UUID,
  p_event_type VARCHAR(100),
  p_payload JSONB DEFAULT NULL,
  p_response_status INTEGER DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT false,
  p_error_message TEXT DEFAULT NULL
) RETURNS webhook_logs
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO webhook_logs (
    webhook_id, merchant_id, event_type, payload, response_status,
    response_body, success, error_message, attempted_at
  )
  VALUES (
    p_webhook_id, p_merchant_id, p_event_type, p_payload, p_response_status,
    p_response_body, p_success, p_error_message, NOW()
  )
  RETURNING *;
$$;

-- ============================================================================
-- ENCRYPTION KEYS TABLE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION create_encryption_key(
  p_merchant_id UUID,
  p_key_type VARCHAR(50),
  p_encrypted_dek TEXT,
  p_key_version INTEGER DEFAULT 1,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS encryption_keys
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO encryption_keys (
    merchant_id, key_type, encrypted_dek, key_version, is_active, created_at, updated_at, expires_at
  )
  VALUES (p_merchant_id, p_key_type, p_encrypted_dek, p_key_version, true, NOW(), NOW(), p_expires_at)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION get_active_encryption_key(
  p_merchant_id UUID,
  p_key_type VARCHAR(50)
) RETURNS encryption_keys
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM encryption_keys
  WHERE merchant_id = p_merchant_id
  AND key_type = p_key_type
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY key_version DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION create_encryption_key_log(
  p_merchant_id UUID,
  p_key_type VARCHAR(50),
  p_old_key_id UUID DEFAULT NULL,
  p_new_key_id UUID DEFAULT NULL,
  p_rotation_reason TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
) RETURNS encryption_key_logs
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO encryption_key_logs (
    merchant_id, key_type, old_key_id, new_key_id, rotation_reason, performed_by, performed_at
  )
  VALUES (p_merchant_id, p_key_type, p_old_key_id, p_new_key_id, p_rotation_reason, p_performed_by, NOW())
  RETURNING *;
$$;

-- ============================================================================
-- INVOICES TABLE FUNCTIONS (matches actual schema from migration 002)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_invoice(
  p_merchant_id UUID,
  p_customer_id UUID,
  p_subtotal NUMERIC(10,7),
  p_tax NUMERIC(10,7),
  p_total NUMERIC(10,7),
  p_pos_terminal_id UUID DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT 'pending',
  p_payment_method VARCHAR(20) DEFAULT NULL,
  p_payment_status VARCHAR(20) DEFAULT 'pending',
  p_due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS invoices
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO invoices (
    merchant_id, customer_id, pos_terminal_id, subtotal, tax, total, status, payment_method, payment_status, due_date, notes, created_at, updated_at
  )
  VALUES (
    p_merchant_id, p_customer_id, p_pos_terminal_id, p_subtotal, p_tax, p_total, p_status, p_payment_method, p_payment_status, p_due_date, p_notes, NOW(), NOW()
  )
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION update_invoice_status(
  p_invoice_id UUID,
  p_status VARCHAR(20) DEFAULT NULL,
  p_payment_status VARCHAR(20) DEFAULT NULL,
  p_pi_payment_id VARCHAR(255) DEFAULT NULL,
  p_pi_transaction_id VARCHAR(255) DEFAULT NULL
) RETURNS invoices
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  UPDATE invoices SET
    status = COALESCE(p_status, status),
    payment_status = COALESCE(p_payment_status, payment_status),
    pi_payment_id = COALESCE(p_pi_payment_id, pi_payment_id),
    pi_transaction_id = COALESCE(p_pi_transaction_id, pi_transaction_id),
    updated_at = NOW()
  WHERE id = p_invoice_id
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION create_invoice_item(
  p_invoice_id UUID,
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_unit_price NUMERIC(10,7),
  p_total_price NUMERIC(10,7),
  p_product_id UUID DEFAULT NULL
) RETURNS invoice_items
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO invoice_items (
    invoice_id, product_id, product_name, quantity, unit_price, total_price, created_at
  )
  VALUES (
    p_invoice_id, p_product_id, p_product_name, p_quantity, p_unit_price, p_total_price, NOW()
  )
  RETURNING *;
$$;

-- ============================================================================
-- POS TERMINALS TABLE FUNCTIONS (matches actual schema from migration 002)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_pos_terminal(
  p_merchant_id UUID,
  p_name VARCHAR(255),
  p_terminal_code VARCHAR(50),
  p_location VARCHAR(255) DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
) RETURNS pos_terminals
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO pos_terminals (
    merchant_id, name, terminal_code, location, is_active, created_at, updated_at
  )
  VALUES (p_merchant_id, p_name, p_terminal_code, p_location, p_is_active, NOW(), NOW())
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION get_pos_terminal(
  p_terminal_id UUID
) RETURNS pos_terminals
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM pos_terminals WHERE id = p_terminal_id;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS users_select_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_policy ON users;
DROP POLICY IF EXISTS users_delete_policy ON users;
DROP POLICY IF EXISTS merchants_select_policy ON merchants;
DROP POLICY IF EXISTS merchants_insert_policy ON merchants;
DROP POLICY IF EXISTS merchants_update_policy ON merchants;
DROP POLICY IF EXISTS merchants_delete_policy ON merchants;
DROP POLICY IF EXISTS products_select_policy ON products;
DROP POLICY IF EXISTS products_insert_policy ON products;
DROP POLICY IF EXISTS products_update_policy ON products;
DROP POLICY IF EXISTS products_delete_policy ON products;
DROP POLICY IF EXISTS merchant_products_select_policy ON merchant_products;
DROP POLICY IF EXISTS merchant_products_insert_policy ON merchant_products;
DROP POLICY IF EXISTS merchant_products_update_policy ON merchant_products;
DROP POLICY IF EXISTS merchant_products_delete_policy ON merchant_products;
DROP POLICY IF EXISTS merchant_inventory_select_policy ON merchant_inventory;
DROP POLICY IF EXISTS merchant_inventory_insert_policy ON merchant_inventory;
DROP POLICY IF EXISTS merchant_inventory_update_policy ON merchant_inventory;
DROP POLICY IF EXISTS merchant_inventory_delete_policy ON merchant_inventory;
DROP POLICY IF EXISTS categories_select_policy ON categories;
DROP POLICY IF EXISTS categories_insert_policy ON categories;
DROP POLICY IF EXISTS categories_update_policy ON categories;
DROP POLICY IF EXISTS categories_delete_policy ON categories;
DROP POLICY IF EXISTS sales_select_policy ON sales;
DROP POLICY IF EXISTS sales_insert_policy ON sales;
DROP POLICY IF EXISTS sales_update_policy ON sales;
DROP POLICY IF EXISTS sales_delete_policy ON sales;
DROP POLICY IF EXISTS sale_items_select_policy ON sale_items;
DROP POLICY IF EXISTS sale_items_insert_policy ON sale_items;
DROP POLICY IF EXISTS sale_items_update_policy ON sale_items;
DROP POLICY IF EXISTS sale_items_delete_policy ON sale_items;
DROP POLICY IF EXISTS inventory_transactions_select_policy ON inventory_transactions;
DROP POLICY IF EXISTS inventory_transactions_insert_policy ON inventory_transactions;
DROP POLICY IF EXISTS inventory_transactions_update_policy ON inventory_transactions;
DROP POLICY IF EXISTS inventory_transactions_delete_policy ON inventory_transactions;
DROP POLICY IF EXISTS sessions_select_policy ON sessions;
DROP POLICY IF EXISTS sessions_insert_policy ON sessions;
DROP POLICY IF EXISTS sessions_update_policy ON sessions;
DROP POLICY IF EXISTS sessions_delete_policy ON sessions;
DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_update_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_delete_policy ON audit_logs;
DROP POLICY IF EXISTS merchant_settings_select_policy ON merchant_settings;
DROP POLICY IF EXISTS merchant_settings_insert_policy ON merchant_settings;
DROP POLICY IF EXISTS merchant_settings_update_policy ON merchant_settings;
DROP POLICY IF EXISTS merchant_settings_delete_policy ON merchant_settings;
DROP POLICY IF EXISTS webhooks_select_policy ON webhooks;
DROP POLICY IF EXISTS webhooks_insert_policy ON webhooks;
DROP POLICY IF EXISTS webhooks_update_policy ON webhooks;
DROP POLICY IF EXISTS webhooks_delete_policy ON webhooks;
DROP POLICY IF EXISTS webhook_logs_select_policy ON webhook_logs;
DROP POLICY IF EXISTS webhook_logs_insert_policy ON webhook_logs;
DROP POLICY IF EXISTS webhook_logs_update_policy ON webhook_logs;
DROP POLICY IF EXISTS webhook_logs_delete_policy ON webhook_logs;
DROP POLICY IF EXISTS encryption_keys_select_policy ON encryption_keys;
DROP POLICY IF EXISTS encryption_keys_insert_policy ON encryption_keys;
DROP POLICY IF EXISTS encryption_keys_update_policy ON encryption_keys;
DROP POLICY IF EXISTS encryption_keys_delete_policy ON encryption_keys;
DROP POLICY IF EXISTS encryption_key_logs_select_policy ON encryption_key_logs;
DROP POLICY IF EXISTS encryption_key_logs_insert_policy ON encryption_key_logs;
DROP POLICY IF EXISTS encryption_key_logs_update_policy ON encryption_key_logs;
DROP POLICY IF EXISTS encryption_key_logs_delete_policy ON encryption_key_logs;
DROP POLICY IF EXISTS invoices_select_policy ON invoices;
DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
DROP POLICY IF EXISTS invoices_update_policy ON invoices;
DROP POLICY IF EXISTS invoices_delete_policy ON invoices;
DROP POLICY IF EXISTS invoice_items_select_policy ON invoice_items;
DROP POLICY IF EXISTS invoice_items_insert_policy ON invoice_items;
DROP POLICY IF EXISTS invoice_items_update_policy ON invoice_items;
DROP POLICY IF EXISTS invoice_items_delete_policy ON invoice_items;
DROP POLICY IF EXISTS pos_terminals_select_policy ON pos_terminals;
DROP POLICY IF EXISTS pos_terminals_insert_policy ON pos_terminals;
DROP POLICY IF EXISTS pos_terminals_update_policy ON pos_terminals;
DROP POLICY IF EXISTS pos_terminals_delete_policy ON pos_terminals;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_key_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES
CREATE POLICY users_select_policy ON users
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY users_insert_policy ON users
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY users_update_policy ON users
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY users_delete_policy ON users
  FOR DELETE
  TO mypipos_app
  USING (false);

-- MERCHANTS TABLE POLICIES
CREATE POLICY merchants_select_policy ON merchants
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY merchants_insert_policy ON merchants
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY merchants_update_policy ON merchants
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY merchants_delete_policy ON merchants
  FOR DELETE
  TO mypipos_app
  USING (false);

-- PRODUCTS TABLE POLICIES
CREATE POLICY products_select_policy ON products
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY products_insert_policy ON products
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY products_update_policy ON products
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY products_delete_policy ON products
  FOR DELETE
  TO mypipos_app
  USING (false);

-- MERCHANT PRODUCTS TABLE POLICIES
CREATE POLICY merchant_products_select_policy ON merchant_products
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY merchant_products_insert_policy ON merchant_products
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY merchant_products_update_policy ON merchant_products
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY merchant_products_delete_policy ON merchant_products
  FOR DELETE
  TO mypipos_app
  USING (false);

-- MERCHANT INVENTORY TABLE POLICIES
CREATE POLICY merchant_inventory_select_policy ON merchant_inventory
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY merchant_inventory_insert_policy ON merchant_inventory
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY merchant_inventory_update_policy ON merchant_inventory
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY merchant_inventory_delete_policy ON merchant_inventory
  FOR DELETE
  TO mypipos_app
  USING (false);

-- CATEGORIES TABLE POLICIES
CREATE POLICY categories_select_policy ON categories
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY categories_insert_policy ON categories
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY categories_update_policy ON categories
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY categories_delete_policy ON categories
  FOR DELETE
  TO mypipos_app
  USING (false);

-- SALES TABLE POLICIES
CREATE POLICY sales_select_policy ON sales
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY sales_insert_policy ON sales
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY sales_update_policy ON sales
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY sales_delete_policy ON sales
  FOR DELETE
  TO mypipos_app
  USING (false);

-- SALE ITEMS TABLE POLICIES
CREATE POLICY sale_items_select_policy ON sale_items
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY sale_items_insert_policy ON sale_items
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY sale_items_update_policy ON sale_items
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY sale_items_delete_policy ON sale_items
  FOR DELETE
  TO mypipos_app
  USING (false);

-- INVENTORY TRANSACTIONS TABLE POLICIES
CREATE POLICY inventory_transactions_select_policy ON inventory_transactions
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY inventory_transactions_insert_policy ON inventory_transactions
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY inventory_transactions_update_policy ON inventory_transactions
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY inventory_transactions_delete_policy ON inventory_transactions
  FOR DELETE
  TO mypipos_app
  USING (false);

-- SESSIONS TABLE POLICIES
CREATE POLICY sessions_select_policy ON sessions
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY sessions_insert_policy ON sessions
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY sessions_update_policy ON sessions
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY sessions_delete_policy ON sessions
  FOR DELETE
  TO mypipos_app
  USING (true);

-- AUDIT LOGS TABLE POLICIES
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY audit_logs_update_policy ON audit_logs
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY audit_logs_delete_policy ON audit_logs
  FOR DELETE
  TO mypipos_app
  USING (false);

-- MERCHANT SETTINGS TABLE POLICIES
CREATE POLICY merchant_settings_select_policy ON merchant_settings
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY merchant_settings_insert_policy ON merchant_settings
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY merchant_settings_update_policy ON merchant_settings
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY merchant_settings_delete_policy ON merchant_settings
  FOR DELETE
  TO mypipos_app
  USING (false);

-- WEBHOOKS TABLE POLICIES
CREATE POLICY webhooks_select_policy ON webhooks
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY webhooks_insert_policy ON webhooks
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY webhooks_update_policy ON webhooks
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY webhooks_delete_policy ON webhooks
  FOR DELETE
  TO mypipos_app
  USING (true);

-- WEBHOOK LOGS TABLE POLICIES
CREATE POLICY webhook_logs_select_policy ON webhook_logs
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY webhook_logs_insert_policy ON webhook_logs
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY webhook_logs_update_policy ON webhook_logs
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY webhook_logs_delete_policy ON webhook_logs
  FOR DELETE
  TO mypipos_app
  USING (false);

-- ENCRYPTION KEYS TABLE POLICIES
CREATE POLICY encryption_keys_select_policy ON encryption_keys
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY encryption_keys_insert_policy ON encryption_keys
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY encryption_keys_update_policy ON encryption_keys
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY encryption_keys_delete_policy ON encryption_keys
  FOR DELETE
  TO mypipos_app
  USING (false);

-- ENCRYPTION KEY LOGS TABLE POLICIES
CREATE POLICY encryption_key_logs_select_policy ON encryption_key_logs
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY encryption_key_logs_insert_policy ON encryption_key_logs
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY encryption_key_logs_update_policy ON encryption_key_logs
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY encryption_key_logs_delete_policy ON encryption_key_logs
  FOR DELETE
  TO mypipos_app
  USING (false);

-- INVOICES TABLE POLICIES
CREATE POLICY invoices_select_policy ON invoices
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY invoices_insert_policy ON invoices
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY invoices_update_policy ON invoices
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY invoices_delete_policy ON invoices
  FOR DELETE
  TO mypipos_app
  USING (false);

-- INVOICE ITEMS TABLE POLICIES
CREATE POLICY invoice_items_select_policy ON invoice_items
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY invoice_items_insert_policy ON invoice_items
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY invoice_items_update_policy ON invoice_items
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY invoice_items_delete_policy ON invoice_items
  FOR DELETE
  TO mypipos_app
  USING (false);

-- POS TERMINALS TABLE POLICIES
CREATE POLICY pos_terminals_select_policy ON pos_terminals
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY pos_terminals_insert_policy ON pos_terminals
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY pos_terminals_update_policy ON pos_terminals
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY pos_terminals_delete_policy ON pos_terminals
  FOR DELETE
  TO mypipos_app
  USING (false);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions for SECURITY DEFINER functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

-- Grant table permissions to mypipos_app role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mypipos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mypipos_app;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check SECURITY DEFINER functions
SELECT
  'SECURITY DEFINER Functions' as type,
  count(*) as count
FROM pg_proc
WHERE prosecdef = true;

-- List all SECURITY DEFINER functions
SELECT
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE prosecdef = true
ORDER BY proname;

-- Check RLS enabled tables
SELECT
  'RLS Enabled Tables' as type,
  count(*) as count
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- List all RLS policies
SELECT
  schemaname || '.' || tablename as table_name,
  policyname as policy_name,
  permissive as is_permissive,
  roles as applicable_roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;