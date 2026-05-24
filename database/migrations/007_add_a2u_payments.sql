-- ============================================================================
-- Migration 007: Add A2U (App-to-User) Payment Support
-- ============================================================================
-- Description: Adds support for platform-to-user payments (A2U)
--              Enables refunds, rewards, and merchant payouts
-- Applies: myPiPOS Platform Architecture
-- Author: A2U Implementation
-- Date: 2026-05-24
-- ============================================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- A2U PAYMENTS TABLE
-- ============================================================================
-- Tracks all A2U transactions from platform to users (merchants, customers, staff)

CREATE TABLE IF NOT EXISTS a2u_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Transaction identifiers
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    payment_id VARCHAR(255) NOT NULL,  -- Pi Network payment ID
    txid VARCHAR(255),                  -- Blockchain transaction ID

    -- User relationships
    from_user_type VARCHAR(50) NOT NULL DEFAULT 'platform', -- 'platform'
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_type VARCHAR(50) NOT NULL, -- 'merchant', 'customer', 'staff'
    to_user_username VARCHAR(100),
    to_user_pi_uid VARCHAR(255),

    -- Payment details
    amount DECIMAL(15,7) NOT NULL,      -- Pi amount (supports 7 decimal places)
    memo TEXT,
    transaction_type VARCHAR(50) NOT NULL, -- 'payout', 'refund', 'reward'
    metadata JSONB DEFAULT '{}',

    -- Payment status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payment_completed_at TIMESTAMP WITH TIME ZONE,

    -- Blockchain details
    from_address VARCHAR(255),         -- Platform wallet address
    to_address VARCHAR(255),           -- User wallet address
    network VARCHAR(50) NOT NULL DEFAULT 'Pi Testnet', -- 'Pi Testnet' or 'Pi Network'
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Related transactions
    related_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    related_refund_id UUID,

    -- Audit trail
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- A2U TRANSACTION TYPES
-- ============================================================================
-- Enum for different A2U payment types

CREATE TYPE a2u_transaction_type AS ENUM (
    'merchant_payout',    -- Merchant receives payment after sale (minus platform fee)
    'customer_refund',    -- Customer receives refund for returned items
    'customer_reward',    -- Customer receives loyalty/reward bonus
    'staff_payout',       -- Staff receives commission payment
    'affiliate_payout',   -- Affiliate receives commission payment
    'platform_payout'     -- Any other platform-to-user payment
);

-- Add constraint to ensure transaction_type matches enum
ALTER TABLE a2u_payments
ADD CONSTRAINT check_transaction_type
CHECK (transaction_type IN ('merchant_payout', 'customer_refund', 'customer_reward', 'staff_payout', 'affiliate_payout', 'platform_payout'));

-- ============================================================================
-- A2U PAYMENT STATUS
-- ============================================================================
-- Enum for A2U payment statuses

CREATE TYPE a2u_payment_status AS ENUM (
    'pending',           -- Payment created, not yet submitted
    'creating',          -- Payment being created on Pi Network
    'submitting',        -- Payment being submitted to blockchain
    'completing',        -- Payment being completed on server
    'completed',         -- Payment fully completed
    'failed',            -- Payment failed
    'cancelled'          -- Payment cancelled
);

ALTER TABLE a2u_payments
ADD CONSTRAINT check_status
CHECK (status IN ('pending', 'creating', 'submitting', 'completing', 'completed', 'failed', 'cancelled'));

-- ============================================================================
-- UPDATE SALES TABLE FOR A2U SUPPORT
-- ============================================================================
-- Add A2U-specific columns to existing sales table

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS a2u_merchant_payout_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_merchant_payout_txid VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_merchant_payout_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS a2u_merchant_payout_amount DECIMAL(15,7),
ADD COLUMN IF NOT EXISTS a2u_merchant_payout_completed_at TIMESTAMP WITH TIME ZONE,

ADD COLUMN IF NOT EXISTS a2u_refund_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_refund_txid VARCHAR(255),
ADD COLUMN IF NOT EXISTS a2u_refund_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS a2u_refund_amount DECIMAL(15,7),
ADD COLUMN IF NOT EXISTS a2u_refund_completed_at TIMESTAMP WITH TIME ZONE,

ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(15,7) DEFAULT 0.0000000,
ADD COLUMN IF NOT EXISTS merchant_payout DECIMAL(15,7) DEFAULT 0.0000000,
ADD COLUMN IF NOT EXISTS direction VARCHAR(50) DEFAULT 'customer_to_platform'; -- 'customer_to_platform', 'platform_to_merchant'

-- ============================================================================
-- UPDATE USERS TABLE FOR WALLET ADDRESSES
-- ============================================================================
-- Add wallet address to users table for A2U payments

ALTER TABLE users
ADD COLUMN IF NOT EXISTS pi_wallet_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS wallet_address_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wallet_address_verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- A2U payments indexes
CREATE INDEX IF NOT EXISTS idx_a2u_payments_to_user ON a2u_payments(to_user_id);
CREATE INDEX IF NOT EXISTS idx_a2u_payments_payment_id ON a2u_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_a2u_payments_txid ON a2u_payments(txid);
CREATE INDEX IF NOT EXISTS idx_a2u_payments_status ON a2u_payments(status);
CREATE INDEX IF NOT EXISTS idx_a2u_payments_type ON a2u_payments(transaction_type);
CREATE INDEX IF NOT EXISTS idx_a2u_payments_to_user_type ON a2u_payments(to_user_type);
CREATE INDEX IF NOT EXISTS idx_a2u_payments_created_at ON a2u_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_a2u_payments_related_sale ON a2u_payments(related_sale_id);

-- Sales table A2U indexes
CREATE INDEX IF NOT EXISTS idx_sales_a2u_merchant_payout_status ON sales(a2u_merchant_payout_status) WHERE a2u_merchant_payout_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_a2u_refund_status ON sales(a2u_refund_status) WHERE a2u_refund_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_direction ON sales(direction);

-- Users wallet address index
CREATE INDEX IF NOT EXISTS idx_users_pi_wallet_address ON users(pi_wallet_address) WHERE pi_wallet_address IS NOT NULL;

-- ============================================================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for merchant payouts that need processing
CREATE OR REPLACE VIEW merchant_payouts_pending AS
SELECT
    s.id as sale_id,
    s.transaction_number,
    s.merchant_id,
    s.merchant_payout,
    s.a2u_merchant_payout_status,
    s.created_at,
    u.username as merchant_username,
    u.pi_wallet_address as merchant_wallet
FROM sales s
JOIN users u ON s.merchant_id = u.id
WHERE s.a2u_merchant_payout_status = 'pending'
  AND s.status = 'completed'
  AND s.payment_status = 'completed'
ORDER BY s.created_at ASC;

-- View for customer refunds that need processing
CREATE OR REPLACE VIEW customer_refunds_pending AS
SELECT
    s.id as sale_id,
    s.transaction_number,
    s.customer_id,
    s.a2u_refund_amount,
    s.a2u_refund_status,
    u.username as customer_username,
    u.pi_wallet_address as customer_wallet
FROM sales s
JOIN users u ON s.customer_id = u.id
WHERE s.a2u_refund_status = 'pending'
  AND s.a2u_refund_amount IS NOT NULL
  AND s.a2u_refund_amount > 0
ORDER BY s.created_at ASC;

-- View for A2U payment statistics
CREATE OR REPLACE VIEW a2u_payment_stats AS
SELECT
    to_user_type,
    transaction_type,
    status,
    COUNT(*) as payment_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MIN(created_at) as first_payment,
    MAX(created_at) as last_payment
FROM a2u_payments
GROUP BY to_user_type, transaction_type, status;

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp on a2u_payments
CREATE OR REPLACE FUNCTION update_a2u_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_a2u_payments_updated_at
BEFORE UPDATE ON a2u_payments
FOR EACH ROW
EXECUTE FUNCTION update_a2u_payments_updated_at();

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to generate A2U transaction number
CREATE OR REPLACE FUNCTION generate_a2u_transaction_number()
RETURNS VARCHAR(100) AS $$
DECLARE
    timestamp_part TEXT;
    random_part TEXT;
BEGIN
    timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    random_part := SUBSTR(MD5(RANDOM()::TEXT), 1, 8);
    RETURN 'A2U-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function to create A2U payment record
CREATE OR REPLACE FUNCTION create_a2u_payment(
    p_to_user_id UUID,
    p_to_user_type VARCHAR(50),
    p_amount DECIMAL(15,7),
    p_memo TEXT,
    p_transaction_type VARCHAR(50),
    p_metadata JSONB,
    p_related_sale_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_transaction_number VARCHAR(100);
BEGIN
    -- Generate transaction number
    v_transaction_number := generate_a2u_transaction_number();

    -- Get user details
    INSERT INTO a2u_payments (
        transaction_number,
        to_user_id,
        to_user_type,
        to_user_username,
        to_user_pi_uid,
        amount,
        memo,
        transaction_type,
        metadata,
        related_sale_id,
        status
    )
    SELECT
        v_transaction_number,
        p_to_user_id,
        p_to_user_type,
        u.username,
        u.pi_uid,
        p_amount,
        p_memo,
        p_transaction_type,
        p_metadata,
        p_related_sale_id,
        'pending'
    FROM users u
    WHERE u.id = p_to_user_id
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE a2u_payments IS 'Tracks all A2U (App-to-User) payments from platform to users';
COMMENT ON COLUMN a2u_payments.transaction_number IS 'Unique transaction identifier (A2U-YYYYMMDDHH24MISS-XXXXXXXX)';
COMMENT ON COLUMN a2u_payments.payment_id IS 'Pi Network payment identifier';
COMMENT ON COLUMN a2u_payments.txid IS 'Blockchain transaction ID';
COMMENT ON COLUMN a2u_payments.to_user_type IS 'Type of user receiving payment: merchant, customer, staff';
COMMENT ON COLUMN a2u_payments.transaction_type IS 'Type of A2U payment: merchant_payout, customer_refund, customer_reward, staff_payout';
COMMENT ON COLUMN a2u_payments.status IS 'Current payment status: pending, creating, submitting, completing, completed, failed, cancelled';
COMMENT ON COLUMN a2u_payments.from_address IS 'Platform wallet address sending the payment';
COMMENT ON COLUMN a2u_payments.to_address IS 'User wallet address receiving the payment';
COMMENT ON COLUMN a2u_payments.network IS 'Pi Network used: Pi Testnet or Pi Network';

COMMENT ON COLUMN sales.platform_fee IS 'Platform fee deducted from total amount';
COMMENT ON COLUMN sales.merchant_payout IS 'Amount paid to merchant after platform fee';
COMMENT ON COLUMN sales.direction IS 'Payment direction: customer_to_platform, platform_to_merchant';

COMMENT ON COLUMN users.pi_wallet_address IS 'User Pi Network wallet address for receiving A2U payments';
COMMENT ON COLUMN users.wallet_address_verified IS 'Whether the wallet address has been verified';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to mypipos_app role (consistent with migration 004)
GRANT USAGE ON SCHEMA public TO mypipos_app;

-- Grant permissions on a2u_payments table
GRANT SELECT, INSERT, UPDATE, DELETE ON a2u_payments TO mypipos_app;

-- Grant permissions on related tables
GRANT SELECT, UPDATE ON sales TO mypipos_app;
GRANT SELECT, UPDATE ON users TO mypipos_app;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mypipos_app;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - if using RLS)
-- ============================================================================

-- Enable RLS on a2u_payments if needed
-- ALTER TABLE a2u_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for multi-tenant access if needed
-- CREATE POLICY a2u_payments_isolation_policy ON a2u_payments
-- USING (merchant_id = current_user_merchant_id());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the migration was successful
SELECT 'A2U payments table created' as check_result, COUNT(*) as count
FROM information_schema.tables
WHERE table_name = 'a2u_payments';

SELECT 'A2U indexes created' as check_result, COUNT(*) as count
FROM pg_indexes
WHERE tablename LIKE 'a2u%' OR tablename LIKE '%a2u%';

SELECT 'A2U functions created' as check_result, COUNT(*) as count
FROM pg_proc
WHERE proname LIKE 'a2u%' OR proname LIKE 'generate_a2u%';

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration, uncomment and run:
-- DROP VIEW IF EXISTS a2u_payment_stats;
-- DROP VIEW IF EXISTS customer_refunds_pending;
-- DROP VIEW IF EXISTS merchant_payouts_pending;
-- DROP FUNCTION IF EXISTS create_a2u_payment(UUID, VARCHAR(50), DECIMAL(15,7), TEXT, VARCHAR(50), JSONB, UUID);
-- DROP FUNCTION IF EXISTS generate_a2u_transaction_number();
-- DROP TRIGGER IF EXISTS trigger_update_a2u_payments_updated_at ON a2u_payments;
-- DROP FUNCTION IF EXISTS update_a2u_payments_updated_at();
-- DROP TYPE IF EXISTS a2u_payment_status;
-- DROP TYPE IF EXISTS a2u_transaction_type;
-- DROP TABLE IF EXISTS a2u_payments;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_merchant_payout_id;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_merchant_payout_txid;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_merchant_payout_status;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_merchant_payout_amount;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_merchant_payout_completed_at;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_refund_id;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_refund_txid;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_refund_status;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_refund_amount;
-- ALTER TABLE sales DROP COLUMN IF EXISTS a2u_refund_completed_at;
-- ALTER TABLE sales DROP COLUMN IF EXISTS platform_fee;
-- ALTER TABLE sales DROP COLUMN IF EXISTS merchant_payout;
-- ALTER TABLE sales DROP COLUMN IF EXISTS direction;
-- ALTER TABLE users DROP COLUMN IF EXISTS pi_wallet_address;
-- ALTER TABLE users DROP COLUMN IF EXISTS wallet_address_verified;
-- ALTER TABLE users DROP COLUMN IF EXISTS wallet_address_verified_at;

-- ============================================================================
-- END OF MIGRATION 007
-- ============================================================================