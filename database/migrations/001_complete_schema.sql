-- ============================================================================
-- myPiPOS Complete Database Schema Migration
-- ============================================================================
-- This is a standalone migration file that includes the complete schema
-- Run this directly: psql -U postgres -d mypipos -f 001_complete_schema.sql
-- ============================================================================

-- Drop existing tables if they exist (for re-running migrations)
-- Drop in reverse dependency order to avoid foreign key issues
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS merchant_settings CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS merchant_inventory CASCADE;
DROP TABLE IF EXISTS merchant_products CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS encryption_key_logs CASCADE;
DROP TABLE IF EXISTS encryption_keys CASCADE;

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENCRYPTION KEY MANAGEMENT
-- ============================================================================

CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    key_type VARCHAR(50) NOT NULL,
    encrypted_dek TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    UNIQUE(merchant_id, key_type, key_version)
);

CREATE TABLE encryption_key_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    key_type VARCHAR(50) NOT NULL,
    old_key_id UUID,
    new_key_id UUID,
    rotation_reason TEXT,
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MULTI-TENANT MERCHANTS TABLE
-- ============================================================================

CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    tax_id VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(500),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',
    pi_app_id VARCHAR(255) UNIQUE,
    pi_api_key_encrypted TEXT,
    pi_wallet_address VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    max_products INTEGER DEFAULT 100,
    max_users INTEGER DEFAULT 5,
    max_transactions_per_month INTEGER DEFAULT 1000,
    currency VARCHAR(3) DEFAULT 'USD',
    tax_rate DECIMAL(5,4) DEFAULT 0.0000,
    low_stock_threshold INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    onboarded_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- USERS TABLE (Pioneers + Merchant Staff)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    user_type VARCHAR(20) NOT NULL,
    role VARCHAR(50) NOT NULL,
    pi_uid VARCHAR(255) UNIQUE,
    pi_username VARCHAR(255),
    pi_access_token_encrypted TEXT,
    pi_refresh_token_encrypted TEXT,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    customer_preferences JSONB DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 0,
    total_purchases DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- UNIVERSAL PRODUCTS TABLE (Shared Catalog)
-- ============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    universal_sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    category_id UUID,
    universal_tags TEXT[],
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    country_of_origin VARCHAR(2),
    image_urls TEXT[],
    main_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    attributes JSONB DEFAULT '{}',
    seo_data JSONB DEFAULT '{}'
);

-- ============================================================================
-- MERCHANT PRODUCTS TABLE
-- ============================================================================

CREATE TABLE merchant_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    merchant_sku VARCHAR(100) NOT NULL,
    merchant_barcode VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    compare_at_price DECIMAL(10,2),
    tax_included BOOLEAN DEFAULT false,
    merchant_category_id UUID,
    merchant_tags TEXT[],
    is_taxable BOOLEAN DEFAULT true,
    tax_group VARCHAR(50),
    requires_shipping BOOLEAN DEFAULT true,
    track_inventory BOOLEAN DEFAULT true,
    continue_selling_when_out_of_stock BOOLEAN DEFAULT false,
    display_name VARCHAR(255),
    display_description TEXT,
    display_image_url VARCHAR(500),
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    pricing_data_encrypted TEXT,
    metadata JSONB DEFAULT '{}',
    merchant_notes TEXT,
    UNIQUE(merchant_id, product_id),
    UNIQUE(merchant_id, merchant_sku)
);

-- ============================================================================
-- MERCHANT INVENTORY TABLE
-- ============================================================================

CREATE TABLE merchant_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    low_stock_threshold INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 20,
    max_stock INTEGER,
    location_id UUID,
    bin_location VARCHAR(100),
    shelf_location VARCHAR(100),
    average_cost DECIMAL(10,2),
    last_cost DECIMAL(10,2),
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (current_stock * COALESCE(average_cost, 0)) STORED,
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    next_count_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    UNIQUE(merchant_id, product_id)
);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255),
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(merchant_id, slug)
);

-- ============================================================================
-- SALES TABLE
-- ============================================================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'sale',
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    pi_payment_id VARCHAR(255),
    pi_transaction_id VARCHAR(255),
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    register_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    payment_details_encrypted TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    UNIQUE(merchant_id, transaction_number)
);

-- ============================================================================
-- SALE ITEMS TABLE
-- ============================================================================

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    universal_sku VARCHAR(100),
    merchant_sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    cost_per_unit DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INVENTORY TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(255),
    notes TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    device_type VARCHAR(50),
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoke_reason TEXT
);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SETTINGS TABLE
-- ============================================================================

CREATE TABLE merchant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    setting_category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(merchant_id, setting_category, setting_key)
);

-- ============================================================================
-- WEBHOOKS TABLE
-- ============================================================================

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL,
    secret_key VARCHAR(255),
    auth_type VARCHAR(20) DEFAULT 'header',
    is_active BOOLEAN DEFAULT true,
    total_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    last_called_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    response_headers JSONB,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT
);

COMMIT;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Create indexes for performance
CREATE INDEX idx_merchants_pi_app_id ON merchants(pi_app_id) WHERE pi_app_id IS NOT NULL;
CREATE INDEX idx_merchants_is_active ON merchants(is_active);
CREATE INDEX idx_users_merchant_id ON users(merchant_id) WHERE merchant_id IS NOT NULL;
CREATE INDEX idx_users_pi_uid ON users(pi_uid) WHERE pi_uid IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_products_universal_sku ON products(universal_sku) WHERE universal_sku IS NOT NULL;
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_merchant_products_merchant_id ON merchant_products(merchant_id);
CREATE INDEX idx_merchant_products_product_id ON merchant_products(product_id);
CREATE UNIQUE INDEX idx_merchant_products_merchant_barcode ON merchant_products(merchant_id, merchant_barcode) WHERE merchant_barcode IS NOT NULL;
CREATE INDEX idx_merchant_inventory_merchant_id ON merchant_inventory(merchant_id);
CREATE INDEX idx_sales_merchant_id ON sales(merchant_id);
CREATE INDEX idx_sales_transaction_date ON sales(transaction_date);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- These permissions are typically handled automatically by Neon
-- If you need custom permissions, uncomment below:

-- CREATE ROLE mypipos_app;
-- GRANT USAGE ON SCHEMA public TO mypipos_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mypipos_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mypipos_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mypipos_app;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Add comments
COMMENT ON TABLE merchants IS 'Multi-tenant merchant table with business information';
COMMENT ON TABLE users IS 'User accounts for both Pioneers and merchant staff';
COMMENT ON TABLE products IS 'Universal product catalog shared across all myPiPOS merchants';
COMMENT ON TABLE merchant_products IS 'Per-merchant product pricing and display settings';
COMMENT ON TABLE merchant_inventory IS 'Per-merchant stock levels and inventory management';
COMMENT ON TABLE sales IS 'Sales transactions with payment processing';
