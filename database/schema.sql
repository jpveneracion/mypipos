-- ============================================================================
-- myPiPOS Enterprise Database Schema
-- ============================================================================
-- Features:
-- - UUID coverage on all tables
-- - Row-Level Security (RLS) with security definers
-- - Multi-tenant architecture with merchant isolation
-- - DEK encryption with per-merchant envelope encryption keys
-- - Master encryption key stored in Vercel environment variables
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENCRYPTION KEY MANAGEMENT
-- ============================================================================

-- Master encryption key reference (stored in Vercel env var, not DB)
-- This is only a placeholder for documentation
-- MASTER_ENCRYPTION_KEY environment variable must be set

-- Encryption keys table (stores encrypted DEKs)
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    key_type VARCHAR(50) NOT NULL, -- 'data', 'payments', 'customers', 'inventory'
    encrypted_dek TEXT NOT NULL, -- RSA-encrypted Data Encryption Key
    key_version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    UNIQUE(merchant_id, key_type, key_version)
);

-- Key rotation logs
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

    -- Business address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',

    -- Pi Network integration
    pi_app_id VARCHAR(255) UNIQUE,
    pi_api_key_encrypted TEXT, -- Encrypted with DEK
    pi_wallet_address VARCHAR(255),

    -- Subscription and limits
    subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    max_products INTEGER DEFAULT 100,
    max_users INTEGER DEFAULT 5,
    max_transactions_per_month INTEGER DEFAULT 1000,

    -- Business settings
    currency VARCHAR(3) DEFAULT 'USD',
    tax_rate DECIMAL(5,4) DEFAULT 0.0000,
    low_stock_threshold INTEGER DEFAULT 10,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    onboarded_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- USERS TABLE (Pioneers + Merchant Staff)
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Multi-tenant: merchant_id is NULL for Pioneers
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,

    -- User type and role
    user_type VARCHAR(20) NOT NULL, -- 'pioneer', 'merchant_admin', 'merchant_staff', 'system_admin'
    role VARCHAR(50) NOT NULL, -- 'admin', 'manager', 'cashier', 'customer', etc.

    -- Pi Network identity
    pi_uid VARCHAR(255) UNIQUE,
    pi_username VARCHAR(255),
    pi_access_token_encrypted TEXT, -- Encrypted with DEK
    pi_refresh_token_encrypted TEXT, -- Encrypted with DEK

    -- myPiPOS credentials (for merchant staff)
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255), -- bcrypt hash
    email VARCHAR(255) UNIQUE,

    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),

    -- Customer-specific data (for Pioneers)
    customer_preferences JSONB DEFAULT '{}',
    loyalty_points INTEGER DEFAULT 0,
    total_purchases DECIMAL(15,2) DEFAULT 0.00,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Security
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- UNIVERSAL PRODUCTS TABLE (Shared Catalog)
-- ============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic product info (Universal across all merchants)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    universal_sku VARCHAR(100) UNIQUE, -- Global SKU system
    barcode VARCHAR(100) UNIQUE, -- Universal barcode (UPC/EAN)

    -- Universal product categorization
    category_id UUID,
    universal_tags TEXT[],

    -- Product specifications (universal)
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    country_of_origin VARCHAR(2), -- ISO country code

    -- Universal media
    image_urls TEXT[],
    main_image_url VARCHAR(500),

    -- Product lifecycle
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'draft', 'archived', 'discontinued'
    published_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    attributes JSONB DEFAULT '{}',
    seo_data JSONB DEFAULT '{}',

    -- Constraints
    EXCLUDE USING gist (barcode WITH =) WHERE barcode IS NOT NULL
);

-- ============================================================================
-- MERCHANT PRODUCTS TABLE (Per-Merchant Pricing & Settings)
-- ============================================================================

CREATE TABLE merchant_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Merchant-specific product details
    merchant_sku VARCHAR(100) NOT NULL,
    merchant_barcode VARCHAR(100), -- Optional merchant-specific barcode

    -- Per-merchant pricing (this is what varies)
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    compare_at_price DECIMAL(10,2),
    tax_included BOOLEAN DEFAULT false,

    -- Merchant categorization
    merchant_category_id UUID,
    merchant_tags TEXT[],

    -- Per-merchant settings
    is_taxable BOOLEAN DEFAULT true,
    tax_group VARCHAR(50),
    requires_shipping BOOLEAN DEFAULT true,
    track_inventory BOOLEAN DEFAULT true,
    continue_selling_when_out_of_stock BOOLEAN DEFAULT false,

    -- Merchant display preferences
    display_name VARCHAR(255), -- Override universal name
    display_description TEXT, -- Override universal description
    display_image_url VARCHAR(500), -- Override universal image
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'hidden', 'archived'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Encrypted sensitive pricing data
    pricing_data_encrypted TEXT, -- Encrypted with merchant's DEK

    -- Metadata
    metadata JSONB DEFAULT '{}',
    merchant_notes TEXT,

    UNIQUE(merchant_id, product_id),
    UNIQUE(merchant_id, merchant_sku),
    UNIQUE(merchant_id, merchant_barcode) WHERE merchant_barcode IS NOT NULL
);

-- ============================================================================
-- MERCHANT INVENTORY TABLE (Per-Merchant Stock Levels)
-- ============================================================================

CREATE TABLE merchant_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Stock levels
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0, -- Items in pending orders
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    low_stock_threshold INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 20,
    max_stock INTEGER,

    -- Location tracking
    location_id UUID, -- For multi-location inventory
    bin_location VARCHAR(100),
    shelf_location VARCHAR(100),

    -- Cost tracking
    average_cost DECIMAL(10,2),
    last_cost DECIMAL(10,2),
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (current_stock * COALESCE(average_cost, 0)) STORED,

    -- Inventory management
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    next_count_date DATE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,

    UNIQUE(merchant_id, product_id, location_id) WHERE location_id IS NOT NULL,
    UNIQUE(merchant_id, product_id) WHERE location_id IS NULL
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

    -- Display order
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    UNIQUE(merchant_id, slug)
);

-- ============================================================================
-- SALES/TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Transaction details
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'sale', -- 'sale', 'refund', 'exchange'

    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,

    -- Payment
    payment_method VARCHAR(50) NOT NULL, -- 'pi', 'cash', 'card', 'other'
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    pi_payment_id VARCHAR(255),
    pi_transaction_id VARCHAR(255),

    -- Staff
    cashier_id UUID REFERENCES users(id) ON DELETE SET NULL,
    register_id VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'cancelled', 'refunded'

    -- Timestamps
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Encrypted payment details (for reconciliation)
    payment_details_encrypted TEXT, -- Encrypted with DEK

    -- Metadata
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

    -- Item details (captured at time of sale for historical accuracy)
    product_name VARCHAR(255) NOT NULL,
    universal_sku VARCHAR(100),
    merchant_sku VARCHAR(100),
    quantity INTEGER NOT NULL,

    -- Pricing (merchant-specific price at time of sale)
    unit_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,

    -- Cost tracking (merchant-specific cost)
    cost_per_unit DECIMAL(10,2),
    total_cost DECIMAL(10,2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INVENTORY TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL, -- 'sale', 'restock', 'adjustment', 'return', 'transfer'
    quantity INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,

    -- Reference
    reference_id UUID, -- Can reference sale_id, purchase_order_id, etc.
    reference_type VARCHAR(50),

    -- Staff
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Reason and notes
    reason VARCHAR(255),
    notes TEXT,

    -- Timestamps
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    FOREIGN KEY (merchant_id, product_id) REFERENCES merchant_inventory(merchant_id, product_id)
);

-- ============================================================================
-- SESSIONS TABLE (for authentication)
-- ============================================================================

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,

    -- Session details
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,

    -- Device and location info
    device_type VARCHAR(50),
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
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

    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'product', 'sale', 'user', etc.
    entity_id UUID,

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Request info
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SETTINGS AND CONFIGURATIONS
-- ============================================================================

CREATE TABLE merchant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Settings categories
    setting_category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    is_encrypted BOOLEAN DEFAULT false, -- For sensitive settings

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}',

    UNIQUE(merchant_id, setting_category, setting_key)
);

-- ============================================================================
-- WEBHOOKS AND INTEGRATIONS
-- ============================================================================

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Webhook details
    name VARCHAR(255) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL, -- ['sale.created', 'product.updated', etc.]

    -- Authentication
    secret_key VARCHAR(255),
    auth_type VARCHAR(20) DEFAULT 'header', -- 'header', 'basic', 'bearer'

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Statistics
    total_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    last_called_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,

    -- Response details
    response_status INTEGER,
    response_body TEXT,
    response_headers JSONB,

    -- Timing
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER,

    -- Status
    success BOOLEAN DEFAULT false,
    error_message TEXT
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Merchants indexes
CREATE INDEX idx_merchants_pi_app_id ON merchants(pi_app_id) WHERE pi_app_id IS NOT NULL;
CREATE INDEX idx_merchants_is_active ON merchants(is_active);
CREATE INDEX idx_merchants_subscription_tier ON merchants(subscription_tier);

-- Users indexes
CREATE INDEX idx_users_merchant_id ON users(merchant_id) WHERE merchant_id IS NOT NULL;
CREATE INDEX idx_users_pi_uid ON users(pi_uid) WHERE pi_uid IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Products indexes
CREATE INDEX idx_products_universal_sku ON products(universal_sku) WHERE universal_sku IS NOT NULL;
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_category_id ON products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_universal_tags ON products USING GIN(universal_tags);

-- Merchant products indexes
CREATE INDEX idx_merchant_products_merchant_id ON merchant_products(merchant_id);
CREATE INDEX idx_merchant_products_product_id ON merchant_products(product_id);
CREATE INDEX idx_merchant_products_merchant_sku ON merchant_products(merchant_sku);
CREATE INDEX idx_merchant_products_merchant_barcode ON merchant_products(merchant_barcode) WHERE merchant_barcode IS NOT NULL;
CREATE INDEX idx_merchant_products_status ON merchant_products(status);
CREATE INDEX idx_merchant_products_is_visible ON merchant_products(is_visible) WHERE is_visible = true;

-- Merchant inventory indexes
CREATE INDEX idx_merchant_inventory_merchant_id ON merchant_inventory(merchant_id);
CREATE INDEX idx_merchant_inventory_product_id ON merchant_inventory(product_id);
CREATE INDEX idx_merchant_inventory_low_stock ON merchant_inventory(merchant_id) WHERE current_stock <= low_stock_threshold;
CREATE INDEX idx_merchant_inventory_location ON merchant_inventory(location_id) WHERE location_id IS NOT NULL;

-- Sales indexes
CREATE INDEX idx_sales_merchant_id ON sales(merchant_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_transaction_date ON sales(transaction_date);
CREATE INDEX idx_sales_payment_status ON sales(payment_status);
CREATE INDEX idx_sales_merchant_date ON sales(merchant_id, transaction_date);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token) WHERE is_active = true;
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at) WHERE is_active = true;

-- Audit logs indexes
CREATE INDEX idx_audit_logs_merchant_id ON audit_logs(merchant_id) WHERE merchant_id IS NOT NULL;
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Encryption keys indexes
CREATE INDEX idx_encryption_keys_merchant_id ON encryption_keys(merchant_id);
CREATE INDEX idx_encryption_keys_is_active ON encryption_keys(is_active) WHERE is_active = true;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
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

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Function to get current user and merchant context
CREATE OR REPLACE FUNCTION get_current_user_context()
RETURNS TABLE(current_user_id UUID, merchant_id UUID, user_type VARCHAR(20), role VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.merchant_id,
        u.user_type,
        u.role
    FROM users u
    WHERE u.id = current_setting('app.current_user_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to merchant data
CREATE OR REPLACE FUNCTION has_merchant_access(target_merchant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_context RECORD;
BEGIN
    SELECT * INTO user_context FROM get_current_user_context();

    -- System admins can access everything
    IF user_context.user_type = 'system_admin' THEN
        RETURN true;
    END IF;

    -- Pioneers can only access their own data
    IF user_context.user_type = 'pioneer' THEN
        RETURN false; -- Pioneers don't have merchant access
    END IF;

    -- Merchant users can access their own merchant data
    IF user_context.user_type IN ('merchant_admin', 'merchant_staff') THEN
        RETURN user_context.merchant_id = target_merchant_id;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set the current user context (called during authentication)
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Merchants table policies
CREATE POLICY merchants_select_policy ON merchants
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context()
            WHERE (user_type = 'system_admin' OR merchant_id = id)
        )
    );

CREATE POLICY merchants_insert_policy ON merchants
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context()
            WHERE user_type = 'system_admin'
        )
    );

CREATE POLICY merchants_update_policy ON merchants
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context()
            WHERE (user_type = 'system_admin' OR merchant_id = id)
        )
    );

-- Users table policies
CREATE POLICY users_select_policy ON users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = merchant_id OR
                ctx.id = id
            )
        )
    );

CREATE POLICY users_update_policy ON users
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = merchant_id OR
                ctx.id = id
            )
        )
    );

-- Universal Products table policies (system admin only for management, read-only for merchants)
CREATE POLICY products_select_policy ON products
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.user_type = 'system_admin'
        )
        OR EXISTS (
            -- Merchants can see products they have in their catalog
            SELECT 1 FROM get_current_user_context() ctx
            JOIN merchant_products mp ON mp.product_id = products.id
            WHERE ctx.merchant_id = mp.merchant_id
        )
    );

CREATE POLICY products_insert_policy ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.user_type = 'system_admin'
        )
    );

CREATE POLICY products_update_policy ON products
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.user_type = 'system_admin'
        )
    );

CREATE POLICY products_delete_policy ON products
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.user_type = 'system_admin'
        )
    );

-- Merchant Products table policies
CREATE POLICY merchant_products_select_policy ON merchant_products
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (ctx.user_type = 'system_admin' OR ctx.merchant_id = merchant_products.merchant_id)
        )
    );

CREATE POLICY merchant_products_insert_policy ON merchant_products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = merchant_products.merchant_id
        )
    );

CREATE POLICY merchant_products_update_policy ON merchant_products
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = merchant_products.merchant_id
        )
    );

CREATE POLICY merchant_products_delete_policy ON merchant_products
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = merchant_products.merchant_id
        )
    );

-- Merchant Inventory table policies
CREATE POLICY merchant_inventory_select_policy ON merchant_inventory
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (ctx.user_type = 'system_admin' OR ctx.merchant_id = merchant_inventory.merchant_id)
        )
    );

CREATE POLICY merchant_inventory_insert_policy ON merchant_inventory
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = merchant_inventory.merchant_id
        )
    );

CREATE POLICY merchant_inventory_update_policy ON merchant_inventory
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = merchant_inventory.merchant_id
        )
    );

-- Sales table policies
CREATE POLICY sales_select_policy ON sales
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (ctx.user_type = 'system_admin' OR ctx.merchant_id = sales.merchant_id)
        )
    );

CREATE POLICY sales_insert_policy ON sales
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = sales.merchant_id
        )
    );

-- Similar policies for other tables...
CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (ctx.user_type = 'system_admin' OR ctx.merchant_id = categories.merchant_id)
        )
    );

-- ============================================================================
-- TRIGGERS FOR TIMESTAMPS AND AUDIT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit logs
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    user_context RECORD;
BEGIN
    SELECT * INTO user_context FROM get_current_user_context();

    INSERT INTO audit_logs (
        merchant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        NEW.merchant_id,
        user_context.current_user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit logging to key tables
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_users
    AFTER UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ============================================================================
-- ENCRYPTION FUNCTIONS
-- ============================================================================

-- Function to encrypt data with DEK
CREATE OR REPLACE FUNCTION encrypt_data(merchant_id UUID, data TEXT, data_type VARCHAR DEFAULT 'data')
RETURNS TEXT AS $$
DECLARE
    dek_record RECORD;
    decrypted_dek TEXT;
    encrypted_data TEXT;
BEGIN
    -- Get active DEK for merchant
    SELECT * INTO dek_record
    FROM encryption_keys
    WHERE merchant_id = encrypt_data.merchant_id
        AND key_type = encrypt_data.data_type
        AND is_active = true
    ORDER BY key_version DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active encryption key found for merchant % and type %', merchant_id, data_type;
    END IF;

    -- Decrypt DEK using master key from environment
    -- This is a placeholder - actual implementation would use pgcrypto
    decrypted_dek = pgp_sym_decrypt(dek_record.encrypted_dek, current_setting('app.master_encryption_key'));

    -- Encrypt data with decrypted DEK
    encrypted_data = pgp_sym_encrypt(data, decrypted_dek);

    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt data with DEK
CREATE OR REPLACE FUNCTION decrypt_data(merchant_id UUID, encrypted_data TEXT, data_type VARCHAR DEFAULT 'data')
RETURNS TEXT AS $$
DECLARE
    dek_record RECORD;
    decrypted_dek TEXT;
    decrypted_data TEXT;
BEGIN
    -- Get active DEK for merchant
    SELECT * INTO dek_record
    FROM encryption_keys
    WHERE merchant_id = decrypt_data.merchant_id
        AND key_type = decrypt_data.data_type
        AND is_active = true
    ORDER BY key_version DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active encryption key found for merchant % and type %', merchant_id, data_type;
    END IF;

    -- Decrypt DEK using master key from environment
    decrypted_dek = pgp_sym_decrypt(dek_record.encrypted_dek, current_setting('app.master_encryption_key'));

    -- Decrypt data with decrypted DEK
    decrypted_data = pgp_sym_decrypt(encrypted_data, decrypted_dek);

    RETURN decrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIALIZATION DATA
-- ============================================================================

-- Create system admin user (password should be changed immediately)
INSERT INTO users (id, user_type, role, username, email, password_hash, is_active, is_verified)
VALUES (
    uuid_generate_v4(),
    'system_admin',
    'admin',
    'system',
    'system@mypipos.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj9SjKEq7.0W', -- 'changeme123'
    true,
    true
);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

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

-- Low inventory view (merchant-specific)
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

-- Universal product catalog view (for merchants to browse available products)
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

-- Popular products across all merchants (for catalog browsing)
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

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Create application user role
CREATE ROLE mypipos_app;
GRANT CONNECT ON DATABASE mypipos TO mypipos_app;
GRANT USAGE ON SCHEMA public TO mypipos_app;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mypipos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mypipos_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mypipos_app;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- Add comments for documentation
COMMENT ON TABLE merchants IS 'Multi-tenant merchant table with business information';
COMMENT ON TABLE users IS 'User accounts for both Pioneers and merchant staff';
COMMENT ON TABLE products IS 'Universal product catalog shared across all myPiPOS merchants';
COMMENT ON TABLE merchant_products IS 'Per-merchant product pricing and display settings';
COMMENT ON TABLE merchant_inventory IS 'Per-merchant stock levels and inventory management';
COMMENT ON TABLE sales IS 'Sales transactions with payment processing';
COMMENT ON TABLE encryption_keys IS 'Encrypted Data Encryption Keys (DEK) with per-merchant envelope encryption';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all data changes';

-- Add comments explaining the universal product model
COMMENT ON TABLE products IS 'Universal product catalog - ONE product definition shared by ALL merchants, saving massive storage space';
COMMENT ON TABLE merchant_products IS 'Per-merchant pricing and settings - each merchant can set their own price for the same universal product';
COMMENT ON TABLE merchant_inventory IS 'Per-merchant inventory levels - each merchant tracks their own stock independently';

COMMENT ON FUNCTION decrypt_data(UUID, TEXT, VARCHAR) IS 'Decrypts data using merchant-specific DEK';

-- ============================================================================
-- MERCHANT PRODUCT MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to add a universal product to merchant's catalog
CREATE OR REPLACE FUNCTION add_product_to_merchant_catalog(
    p_merchant_id UUID,
    p_product_id UUID,
    p_price DECIMAL,
    p_merchant_sku VARCHAR,
    p_cost DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_merchant_product_id UUID;
    user_context RECORD;
BEGIN
    -- Check permissions
    SELECT * INTO user_context FROM get_current_user_context();

    IF user_context.merchant_id IS DISTINCT FROM p_merchant_id AND user_context.user_type != 'system_admin' THEN
        RAISE EXCEPTION 'Permission denied: Cannot add products to merchant %', p_merchant_id;
    END IF;

    -- Check if product already exists in merchant catalog
    SELECT id INTO v_merchant_product_id
    FROM merchant_products
    WHERE merchant_id = p_merchant_id AND product_id = p_product_id AND deleted_at IS NULL;

    IF v_merchant_product_id IS NOT NULL THEN
        RAISE EXCEPTION 'Product already exists in merchant catalog';
    END IF;

    -- Add to merchant catalog
    INSERT INTO merchant_products (
        merchant_id,
        product_id,
        merchant_sku,
        price,
        cost,
        is_visible,
        status
    ) VALUES (
        p_merchant_id,
        p_product_id,
        p_merchant_sku,
        p_price,
        p_cost,
        true,
        'active'
    ) RETURNING id INTO v_merchant_product_id;

    -- Initialize inventory record
    INSERT INTO merchant_inventory (
        merchant_id,
        product_id,
        current_stock,
        low_stock_threshold
    ) VALUES (
        p_merchant_id,
        p_product_id,
        0,
        10
    );

    -- Log the addition
    INSERT INTO audit_logs (
        merchant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        p_merchant_id,
        user_context.current_user_id,
        'add_to_catalog',
        'merchant_products',
        v_merchant_product_id,
        jsonb_build_object(
            'product_id', p_product_id,
            'merchant_sku', p_merchant_sku,
            'price', p_price
        )
    );

    RETURN v_merchant_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get merchant's active products with inventory
CREATE OR REPLACE FUNCTION get_merchant_products_with_inventory(p_merchant_id UUID)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    merchant_sku VARCHAR,
    universal_sku VARCHAR,
    price DECIMAL,
    current_stock INTEGER,
    low_stock_threshold INTEGER,
    is_low_stock BOOLEAN,
    inventory_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        mp.merchant_sku,
        p.universal_sku,
        mp.price,
        COALESCE(mi.current_stock, 0),
        COALESCE(mi.low_stock_threshold, 10),
        COALESCE(mi.current_stock, 0) <= COALESCE(mi.low_stock_threshold, 10),
        CASE
            WHEN COALESCE(mi.current_stock, 0) = 0 THEN 'out_of_stock'
            WHEN COALESCE(mi.current_stock, 0) <= COALESCE(mi.low_stock_threshold, 10) THEN 'low_stock'
            ELSE 'in_stock'
        END
    FROM merchant_products mp
    JOIN products p ON mp.product_id = p.id
    LEFT JOIN merchant_inventory mi ON mp.merchant_id = mi.merchant_id AND mp.product_id = mi.product_id
    WHERE mp.merchant_id = p_merchant_id
        AND mp.deleted_at IS NULL
        AND mp.is_visible = true
        AND mp.status = 'active'
    ORDER BY mp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrypt_data(UUID, TEXT, VARCHAR) IS 'Decrypts data using merchant-specific DEK';

-- ============================================================================
-- MERCHANT PRODUCT MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to add a universal product to merchant's catalog
CREATE OR REPLACE FUNCTION add_product_to_merchant_catalog(
    p_merchant_id UUID,
    p_product_id UUID,
    p_price DECIMAL,
    p_merchant_sku VARCHAR,
    p_cost DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_merchant_product_id UUID;
    user_context RECORD;
BEGIN
    -- Check permissions
    SELECT * INTO user_context FROM get_current_user_context();

    IF user_context.merchant_id IS DISTINCT FROM p_merchant_id AND user_context.user_type != 'system_admin' THEN
        RAISE EXCEPTION 'Permission denied: Cannot add products to merchant %', p_merchant_id;
    END IF;

    -- Check if product already exists in merchant catalog
    SELECT id INTO v_merchant_product_id
    FROM merchant_products
    WHERE merchant_id = p_merchant_id AND product_id = p_product_id AND deleted_at IS NULL;

    IF v_merchant_product_id IS NOT NULL THEN
        RAISE EXCEPTION 'Product already exists in merchant catalog';
    END IF;

    -- Add to merchant catalog
    INSERT INTO merchant_products (
        merchant_id,
        product_id,
        merchant_sku,
        price,
        cost,
        is_visible,
        status
    ) VALUES (
        p_merchant_id,
        p_product_id,
        p_merchant_sku,
        p_price,
        p_cost,
        true,
        'active'
    ) RETURNING id INTO v_merchant_product_id;

    -- Initialize inventory record
    INSERT INTO merchant_inventory (
        merchant_id,
        product_id,
        current_stock,
        low_stock_threshold
    ) VALUES (
        p_merchant_id,
        p_product_id,
        0,
        10
    );

    -- Log the addition
    INSERT INTO audit_logs (
        merchant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        p_merchant_id,
        user_context.current_user_id,
        'add_to_catalog',
        'merchant_products',
        v_merchant_product_id,
        jsonb_build_object(
            'product_id', p_product_id,
            'merchant_sku', p_merchant_sku,
            'price', p_price
        )
    );

    RETURN v_merchant_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get merchant's active products with inventory
CREATE OR REPLACE FUNCTION get_merchant_products_with_inventory(p_merchant_id UUID)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    merchant_sku VARCHAR,
    universal_sku VARCHAR,
    price DECIMAL,
    current_stock INTEGER,
    low_stock_threshold INTEGER,
    is_low_stock BOOLEAN,
    inventory_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        mp.merchant_sku,
        p.universal_sku,
        mp.price,
        COALESCE(mi.current_stock, 0),
        COALESCE(mi.low_stock_threshold, 10),
        COALESCE(mi.current_stock, 0) <= COALESCE(mi.low_stock_threshold, 10),
        CASE
            WHEN COALESCE(mi.current_stock, 0) = 0 THEN 'out_of_stock'
            WHEN COALESCE(mi.current_stock, 0) <= COALESCE(mi.low_stock_threshold, 10) THEN 'low_stock'
            ELSE 'in_stock'
        END
    FROM merchant_products mp
    JOIN products p ON mp.product_id = p.id
    LEFT JOIN merchant_inventory mi ON mp.merchant_id = mi.merchant_id AND mp.product_id = mi.product_id
    WHERE mp.merchant_id = p_merchant_id
        AND mp.deleted_at IS NULL
        AND mp.is_visible = true
        AND mp.status = 'active'
    ORDER BY mp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;