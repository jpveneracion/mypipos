-- ============================================================================
-- Migration 009: Add U2A (User-to-App) Payment Support
-- ============================================================================
-- Description: Enhances U2A payment infrastructure for customer checkout
--              Adds payment tracking, status management, and blockchain integration
-- Applies: myPiPOS Platform Architecture
-- Author: U2A Implementation
-- Date: 2026-05-24
-- ============================================================================

BEGIN;

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- U2A PAYMENT TYPES
-- ============================================================================
-- Enum for different U2A payment types

CREATE TYPE u2a_payment_type AS ENUM (
    'customer_purchase',    -- Standard customer purchase at POS
    'online_order',         -- Online order payment
    'invoice_payment',      -- Invoice payment by customer
    'pre_order',            -- Pre-order for future pickup
    'subscription_payment', -- Recurring subscription payment
    'deposit_payment'       -- Deposit for future service
);

-- ============================================================================
-- U2A PAYMENT STATUS
-- ============================================================================
-- Enum for U2A payment statuses

CREATE TYPE u2a_payment_status AS ENUM (
    'pending',           -- Payment created, waiting for customer
    'initiated',         -- Customer initiated payment
    'awaiting_approval', -- Payment waiting for merchant approval
    'approved',          -- Payment approved by merchant
    'processing',        -- Payment being processed on blockchain
    'completed',         -- Payment fully completed
    'failed',            -- Payment failed
    'cancelled',         -- Payment cancelled
    'expired',           -- Payment expired (not completed in time)
    'refunded'           -- Payment was refunded
);

-- ============================================================================
-- UPDATE SALES TABLE FOR U2A SUPPORT
-- ============================================================================
-- Add U2A-specific columns to existing sales table

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS u2a_payment_type VARCHAR(50) DEFAULT 'customer_purchase',
ADD COLUMN IF NOT EXISTS u2a_payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS u2a_payment_initiated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS u2a_payment_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS u2a_payment_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS u2a_payment_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS u2a_blockchain_txid VARCHAR(255),
ADD COLUMN IF NOT EXISTS u2a_blockchain_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS u2a_payment_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS u2a_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS u2a_last_retry_at TIMESTAMP WITH TIME ZONE;

-- Add constraints for U2A payment types and statuses
ALTER TABLE sales
ADD CONSTRAINT check_u2a_payment_type
CHECK (u2a_payment_type IN ('customer_purchase', 'online_order', 'invoice_payment', 'pre_order', 'subscription_payment', 'deposit_payment'));

ALTER TABLE sales
ADD CONSTRAINT check_u2a_payment_status
CHECK (u2a_payment_status IN ('pending', 'initiated', 'awaiting_approval', 'approved', 'processing', 'completed', 'failed', 'cancelled', 'expired', 'refunded'));

-- ============================================================================
-- CREATE U2A PAYMENT ATTEMPTS TABLE
-- ============================================================================
-- Tracks individual U2A payment attempts for retry logic and analytics

CREATE TABLE IF NOT EXISTS u2a_payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Payment identifiers
    attempt_number VARCHAR(100) UNIQUE NOT NULL,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    original_payment_id VARCHAR(255) NOT NULL, -- Pi Network payment ID

    -- Payment details
    amount DECIMAL(15,7) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_pi_uid VARCHAR(255),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Blockchain details
    blockchain_txid VARCHAR(255),
    blockchain_confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmation_count INTEGER DEFAULT 0,

    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,

    -- Payment metadata
    payment_metadata JSONB DEFAULT '{}',
    customer_ip VARCHAR(45),
    user_agent TEXT,

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Drop indexes if they exist (for idempotent migration)
DROP INDEX IF EXISTS idx_sales_u2a_payment_status;
DROP INDEX IF EXISTS idx_sales_u2a_payment_type;
DROP INDEX IF EXISTS idx_sales_u2a_payment_initiated;
DROP INDEX IF EXISTS idx_sales_u2a_blockchain_txid;
DROP INDEX IF EXISTS idx_sales_u2a_payment_expires;

DROP INDEX IF EXISTS idx_u2a_attempts_sale_id;
DROP INDEX IF EXISTS idx_u2a_attempts_payment_id;
DROP INDEX IF EXISTS idx_u2a_attempts_status;
DROP INDEX IF EXISTS idx_u2a_attempts_customer;
DROP INDEX IF EXISTS idx_u2a_attempts_merchant;
DROP INDEX IF EXISTS idx_u2a_attempts_created;
DROP INDEX IF EXISTS idx_u2a_attempts_expires;

-- Sales table U2A indexes
CREATE INDEX IF NOT EXISTS idx_sales_u2a_payment_status ON sales(u2a_payment_status) WHERE u2a_payment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_u2a_payment_type ON sales(u2a_payment_type) WHERE u2a_payment_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_u2a_payment_initiated ON sales(u2a_payment_initiated_at DESC) WHERE u2a_payment_initiated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_u2a_blockchain_txid ON sales(u2a_blockchain_txid) WHERE u2a_blockchain_txid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_u2a_payment_expires ON sales(u2a_payment_expires_at) WHERE u2a_payment_expires_at IS NOT NULL;

-- U2A payment attempts indexes
CREATE INDEX IF NOT EXISTS idx_u2a_attempts_sale_id ON u2a_payment_attempts(sale_id);
CREATE INDEX IF NOT EXISTS idx_u2a_attempts_payment_id ON u2a_payment_attempts(original_payment_id);
CREATE INDEX IF NOT EXISTS idx_u2a_attempts_status ON u2a_payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_u2a_attempts_customer ON u2a_payment_attempts(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_u2a_attempts_merchant ON u2a_payment_attempts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_u2a_attempts_created ON u2a_payment_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_u2a_attempts_expires ON u2a_payment_attempts(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for active U2A payments that need attention
CREATE OR REPLACE VIEW u2a_payments_active AS
SELECT
    s.id as sale_id,
    s.transaction_number,
    s.customer_id,
    s.merchant_id,
    s.total_amount,
    s.u2a_payment_status,
    s.u2a_payment_type,
    s.u2a_payment_initiated_at,
    s.u2a_payment_expires_at,
    s.pi_payment_id,
    s.u2a_blockchain_txid,
    u.username as customer_username,
    u.pi_uid as customer_pi_uid,
    m.business_name as merchant_business_name,
    CASE
        WHEN s.u2a_payment_expires_at < NOW() THEN 'expired'
        WHEN s.u2a_payment_status = 'pending' THEN 'awaiting_initiation'
        WHEN s.u2a_payment_status = 'initiated' THEN 'awaiting_approval'
        WHEN s.u2a_payment_status = 'approved' THEN 'awaiting_completion'
        ELSE s.u2a_payment_status
    END as action_needed
FROM sales s
JOIN users u ON s.customer_id = u.id
JOIN merchants m ON s.merchant_id = m.id
WHERE s.u2a_payment_status IN ('pending', 'initiated', 'approved', 'processing')
  AND (s.u2a_payment_expires_at IS NULL OR s.u2a_payment_expires_at > NOW())
ORDER BY s.u2a_payment_initiated_at ASC;

-- View for U2A payment statistics
CREATE OR REPLACE VIEW u2a_payment_stats AS
SELECT
    u2a_payment_type,
    u2a_payment_status,
    COUNT(*) as payment_count,
    SUM(total_amount) as total_amount,
    AVG(total_amount) as average_amount,
    MIN(u2a_payment_initiated_at) as first_payment,
    MAX(u2a_payment_initiated_at) as last_payment,
    COUNT(CASE WHEN u2a_payment_status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN u2a_payment_status = 'failed' THEN 1 END) as failed_count,
    ROUND(100.0 * COUNT(CASE WHEN u2a_payment_status = 'completed' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as success_rate
FROM sales
WHERE u2a_payment_type IS NOT NULL
GROUP BY u2a_payment_type, u2a_payment_status;

-- View for expired U2A payments
CREATE OR REPLACE VIEW u2a_payments_expired AS
SELECT
    s.id as sale_id,
    s.transaction_number,
    s.customer_id,
    s.merchant_id,
    s.total_amount,
    s.u2a_payment_status,
    s.u2a_payment_expires_at,
    s.u2a_payment_initiated_at,
    u.username as customer_username,
    u.pi_uid as customer_pi_uid,
    EXTRACT(EPOCH FROM (NOW() - s.u2a_payment_expires_at))/3600 as hours_expired
FROM sales s
JOIN users u ON s.customer_id = u.id
WHERE s.u2a_payment_expires_at IS NOT NULL
  AND s.u2a_payment_expires_at < NOW()
  AND s.u2a_payment_status NOT IN ('completed', 'cancelled', 'failed', 'refunded')
ORDER BY s.u2a_payment_expires_at ASC;

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp on u2a_payment_attempts
CREATE OR REPLACE FUNCTION update_u2a_payment_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_u2a_payment_attempts_updated_at
BEFORE UPDATE ON u2a_payment_attempts
FOR EACH ROW
EXECUTE FUNCTION update_u2a_payment_attempts_updated_at();

-- Auto-expire payments
CREATE OR REPLACE FUNCTION expire_u2a_payments()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if payment has expired and update status
    IF NEW.u2a_payment_expires_at IS NOT NULL
       AND NEW.u2a_payment_expires_at < NOW()
       AND NEW.u2a_payment_status NOT IN ('completed', 'cancelled', 'failed', 'refunded', 'expired') THEN
        NEW.u2a_payment_status = 'expired';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_u2a_payments
BEFORE UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION expire_u2a_payments();

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate U2A payment attempt number
CREATE OR REPLACE FUNCTION generate_u2a_attempt_number()
RETURNS VARCHAR(100) AS $$
DECLARE
    timestamp_part TEXT;
    random_part TEXT;
BEGIN
    timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    random_part := SUBSTR(MD5(RANDOM()::TEXT), 1, 8);
    RETURN 'U2A-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to create U2A payment attempt
CREATE OR REPLACE FUNCTION create_u2a_payment_attempt(
    p_sale_id UUID,
    p_payment_id VARCHAR(255),
    p_amount DECIMAL(15,7),
    p_payment_type VARCHAR(50),
    p_expires_in_minutes INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_attempt_id UUID;
    v_attempt_number VARCHAR(100);
    v_sale RECORD;
BEGIN
    -- Get sale details
    SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found: %', p_sale_id;
    END IF;

    -- Generate attempt number
    v_attempt_number := generate_u2a_attempt_number();

    -- Create payment attempt
    INSERT INTO u2a_payment_attempts (
        attempt_number,
        sale_id,
        original_payment_id,
        amount,
        payment_type,
        customer_id,
        customer_pi_uid,
        merchant_id,
        status,
        expires_at,
        payment_metadata
    )
    SELECT
        v_attempt_number,
        p_sale_id,
        p_payment_id,
        p_amount,
        p_payment_type,
        v_sale.customer_id,
        u.pi_uid,
        v_sale.merchant_id,
        'pending',
        NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        jsonb_build_object(
            'sale_id', p_sale_id,
            'transaction_number', v_sale.transaction_number,
            'amount', p_amount
        )
    FROM users u
    WHERE u.id = v_sale.customer_id
    RETURNING id INTO v_attempt_id;

    -- Update sale with U2A payment info
    UPDATE sales SET
        u2a_payment_status = 'initiated',
        u2a_payment_initiated_at = NOW(),
        u2a_payment_expires_at = NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        pi_payment_id = p_payment_id,
        updated_at = NOW()
    WHERE id = p_sale_id;

    RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE u2a_payment_attempts IS 'Tracks all U2A (User-to-App) payment attempts for retry logic and analytics';
COMMENT ON COLUMN u2a_payment_attempts.attempt_number IS 'Unique attempt identifier (U2A-YYYYMMDDHH24MISS-XXXXXXXX)';
COMMENT ON COLUMN u2a_payment_attempts.original_payment_id IS 'Pi Network payment identifier';
COMMENT ON COLUMN u2a_payment_attempts.blockchain_txid IS 'Blockchain transaction ID';
COMMENT ON COLUMN u2a_payment_attempts.confirmation_count IS 'Number of blockchain confirmations received';

COMMENT ON COLUMN sales.u2a_payment_type IS 'Type of U2A payment: customer_purchase, online_order, invoice_payment, etc.';
COMMENT ON COLUMN sales.u2a_payment_status IS 'Current U2A payment status: pending, initiated, approved, completed, etc.';
COMMENT ON COLUMN sales.u2a_payment_expires_at IS 'Payment expiration timestamp';
COMMENT ON COLUMN sales.u2a_blockchain_txid IS 'Blockchain transaction ID for U2A payment';
COMMENT ON COLUMN sales.u2a_payment_metadata IS 'Additional U2A payment metadata as JSONB';

COMMENT ON TYPE u2a_payment_type IS 'Enum for different U2A payment types';
COMMENT ON TYPE u2a_payment_status IS 'Enum for U2A payment statuses';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to mypipos_app role
GRANT SELECT, INSERT, UPDATE ON u2a_payment_attempts TO mypipos_app;
GRANT USAGE ON SEQUENCE u2a_payment_attempts_id_seq TO mypipos_app;

-- Grant select on views
GRANT SELECT ON u2a_payments_active TO mypipos_app;
GRANT SELECT ON u2a_payment_stats TO mypipos_app;
GRANT SELECT ON u2a_payments_expired TO mypipos_app;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the migration was successful
SELECT 'U2A payment attempts table created' as check_result, COUNT(*) as count
FROM information_schema.tables
WHERE table_name = 'u2a_payment_attempts';

SELECT 'U2A indexes created' as check_result, COUNT(*) as count
FROM pg_indexes
WHERE tablename LIKE 'u2a%' OR tablename LIKE '%u2a%';

SELECT 'U2A functions created' as check_result, COUNT(*) as count
FROM pg_proc
WHERE proname LIKE 'u2a%' OR proname LIKE 'generate_u2a%';

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration, uncomment and run:
-- DROP VIEW IF EXISTS u2a_payments_expired;
-- DROP VIEW IF EXISTS u2a_payment_stats;
-- DROP VIEW IF EXISTS u2a_payments_active;
-- DROP FUNCTION IF EXISTS create_u2a_payment_attempt(UUID, VARCHAR(255), DECIMAL(15,7), VARCHAR(50), INTEGER);
-- DROP FUNCTION IF EXISTS generate_u2a_attempt_number();
-- DROP TRIGGER IF EXISTS trigger_expire_u2a_payments ON sales;
-- DROP FUNCTION IF EXISTS expire_u2a_payments();
-- DROP TRIGGER IF EXISTS trigger_update_u2a_payment_attempts_updated_at ON u2a_payment_attempts;
-- DROP FUNCTION IF EXISTS update_u2a_payment_attempts_updated_at();
-- DROP TYPE IF EXISTS u2a_payment_status;
-- DROP TYPE IF EXISTS u2a_payment_type;
-- DROP TABLE IF EXISTS u2a_payment_attempts CASCADE;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_payment_type;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_payment_status;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_payment_initiated_at;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_payment_approved_at;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_payment_completed_at;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_payment_expires_at;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_blockchain_txid;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_blockchain_confirmed_at;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_payment_metadata;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_retry_count;
-- ALTER TABLE sales DROP COLUMN IF EXISTS u2a_last_retry_at;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 009
-- ============================================================================