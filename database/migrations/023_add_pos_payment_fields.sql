-- ============================================================================
-- Migration 023: Add POS Payment Fields to Sales Table
-- ============================================================================
-- This migration adds fields needed for the POS system to properly track
-- different payment types and their status, particularly for U2A (User-to-App)
-- payment flow where customers scan QR codes and build draft invoices.
-- ============================================================================

BEGIN;

-- Add u2a_payment_type column to track the type of U2A payment
ALTER TABLE sales ADD COLUMN IF NOT EXISTS u2a_payment_type VARCHAR(50);

-- Add u2a_payment_status column to track U2A payment status
ALTER TABLE sales ADD COLUMN IF NOT EXISTS u2a_payment_status VARCHAR(20);

-- Add comments to document these fields
COMMENT ON COLUMN sales.u2a_payment_type IS 'Type of U2A payment: customer_purchase, merchant_sale, etc.';
COMMENT ON COLUMN sales.u2a_payment_status IS 'Status of U2A payment: pending, processing, completed, failed';

-- Create index for faster queries on draft invoices
CREATE INDEX IF NOT EXISTS idx_sales_u2a_status ON sales(status, u2a_payment_status) WHERE u2a_payment_status IS NOT NULL;

-- Grant permissions to mypipos_app role for new columns (follows principle of least privilege)
GRANT SELECT (u2a_payment_type, u2a_payment_status) ON sales TO mypipos_app;
GRANT UPDATE (u2a_payment_type, u2a_payment_status) ON sales TO mypipos_app;

COMMIT;

-- ============================================================================
-- Migration complete
-- ============================================================================
-- This migration enables the POS system to:
-- 1. Create draft invoices when customers scan QR codes
-- 2. Track U2A payment flow separately from general payment status
-- 3. Support building cart items before final payment
-- 4. Maintain separate payment type tracking for business analytics
--
-- Security considerations:
-- - Uses BEGIN/COMMIT transaction for data consistency
-- - Follows principle of least privilege for mypipos_app role permissions
-- - No RLS policies needed (inherits from existing sales table RLS)
-- - No SECURITY DEFINER needed (not creating functions)
-- ============================================================================