-- ============================================================================
-- Migration 010: U2A Payment Security (RLS + SECURITY DEFINER)
-- ============================================================================
-- Description: Adds RLS policies and SECURITY DEFINER functions for U2A payments
--              Follows security patterns from migration 004 and A2U implementation
-- Author: U2A Implementation
-- Date: 2026-05-24
-- ============================================================================

BEGIN;

-- Ensure mypipos_app role exists (from migration 004)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mypipos_app') THEN
        CREATE ROLE mypipos_app;
    END IF;
END
$$;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS FOR U2A PAYMENTS
-- ============================================================================

-- Function to get U2A payment by sale ID
CREATE OR REPLACE FUNCTION get_u2a_payment_by_sale(p_sale_id UUID)
RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales WHERE id = p_sale_id;
$$;

-- Function to get U2A payment by Pi Network payment ID
CREATE OR REPLACE FUNCTION get_u2a_payment_by_payment_id(p_payment_id VARCHAR(255))
RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales WHERE pi_payment_id = p_payment_id;
$$;

-- Function to get U2A payment by blockchain transaction ID
CREATE OR REPLACE FUNCTION get_u2a_payment_by_txid(p_txid VARCHAR(255))
RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales WHERE u2a_blockchain_txid = p_txid;
$$;

-- Function to get U2A payments by customer
CREATE OR REPLACE FUNCTION get_u2a_payments_by_customer(p_customer_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS SETOF sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales
  WHERE customer_id = p_customer_id
    AND u2a_payment_type IS NOT NULL
  ORDER BY u2a_payment_initiated_at DESC
  LIMIT p_limit;
$$;

-- Function to get U2A payments by merchant
CREATE OR REPLACE FUNCTION get_u2a_payments_by_merchant(p_merchant_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS SETOF sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales
  WHERE merchant_id = p_merchant_id
    AND u2a_payment_type IS NOT NULL
  ORDER BY u2a_payment_initiated_at DESC
  LIMIT p_limit;
$$;

-- Function to get U2A payments by status
CREATE OR REPLACE FUNCTION get_u2a_payments_by_status(p_status VARCHAR(50), p_limit INTEGER DEFAULT 100)
RETURNS SETOF sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales
  WHERE u2a_payment_status = p_status
  ORDER BY u2a_payment_initiated_at ASC
  LIMIT p_limit;
$$;

-- Function to get active U2A payments (pending attention)
CREATE OR REPLACE FUNCTION get_active_u2a_payments(p_limit INTEGER DEFAULT 50)
RETURNS SETOF sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales
  WHERE u2a_payment_status IN ('pending', 'initiated', 'approved', 'processing')
    AND (u2a_payment_expires_at IS NULL OR u2a_payment_expires_at > NOW())
  ORDER BY u2a_payment_initiated_at ASC
  LIMIT p_limit;
$$;

-- Function to get expired U2A payments
CREATE OR REPLACE FUNCTION get_expired_u2a_payments(p_limit INTEGER DEFAULT 100)
RETURNS SETOF sales
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM sales
  WHERE u2a_payment_expires_at IS NOT NULL
    AND u2a_payment_expires_at < NOW()
    AND u2a_payment_status NOT IN ('completed', 'cancelled', 'failed', 'refunded', 'expired')
  ORDER BY u2a_payment_expires_at ASC
  LIMIT p_limit;
$$;

-- Function to initiate U2A payment (enhanced with validation)
CREATE OR REPLACE FUNCTION initiate_u2a_payment(
    p_sale_id UUID,
    p_payment_id VARCHAR(255),
    p_expires_in_minutes INTEGER DEFAULT 30
)
RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale RECORD;
    v_payment_metadata JSONB;
BEGIN
    -- Validate inputs
    IF p_sale_id IS NULL THEN
        RAISE EXCEPTION 'Sale ID is required';
    END IF;

    IF p_payment_id IS NULL THEN
        RAISE EXCEPTION 'Payment ID is required';
    END IF;

    IF p_expires_in_minutes <= 0 OR p_expires_in_minutes > 1440 THEN -- Max 24 hours
        RAISE EXCEPTION 'Expiration time must be between 1 and 1440 minutes';
    END IF;

    -- Get sale details
    SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found: %', p_sale_id;
    END IF;

    -- Check if payment is already initiated
    IF v_sale.u2a_payment_status IN ('initiated', 'approved', 'processing', 'completed') THEN
        RAISE EXCEPTION 'Payment already initiated for sale: %', p_sale_id;
    END IF;

    -- Prepare payment metadata
    v_payment_metadata := jsonb_build_object(
        'payment_id', p_payment_id,
        'initiated_at', NOW(),
        'expires_at', NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        'sale_amount', v_sale.total_amount,
        'customer_id', v_sale.customer_id
    );

    -- Update sale with U2A payment initiation
    UPDATE sales SET
        u2a_payment_status = 'initiated',
        u2a_payment_initiated_at = NOW(),
        u2a_payment_expires_at = NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        pi_payment_id = p_payment_id,
        u2a_payment_metadata = v_payment_metadata,
        updated_at = NOW()
    WHERE id = p_sale_id
    RETURNING * INTO v_sale;

    -- Create payment attempt record
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
        initiated_at,
        expires_at,
        payment_metadata
    )
    SELECT
        generate_u2a_attempt_number(),
        p_sale_id,
        p_payment_id,
        v_sale.total_amount,
        v_sale.u2a_payment_type,
        v_sale.customer_id,
        u.pi_uid,
        v_sale.merchant_id,
        'initiated',
        NOW(),
        NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL,
        v_payment_metadata
    FROM users u
    WHERE u.id = v_sale.customer_id;

    RETURN v_sale;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE WARNING 'Failed to initiate U2A payment: %', SQLERRM;
        RAISE;
END;
$$;

-- Function to approve U2A payment
CREATE OR REPLACE FUNCTION approve_u2a_payment(
    p_payment_id VARCHAR(255),
    p_approved_by UUID DEFAULT NULL
)
RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale RECORD;
BEGIN
    -- Get sale by payment ID
    SELECT * INTO v_sale FROM sales WHERE pi_payment_id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;

    -- Validate payment can be approved
    IF v_sale.u2a_payment_status NOT IN ('initiated', 'awaiting_approval') THEN
        RAISE EXCEPTION 'Payment cannot be approved. Current status: %', v_sale.u2a_payment_status;
    END IF;

    -- Check if payment has expired
    IF v_sale.u2a_payment_expires_at IS NOT NULL AND v_sale.u2a_payment_expires_at < NOW() THEN
        RAISE EXCEPTION 'Payment has expired';
    END IF;

    -- Update sale with approval
    UPDATE sales SET
        u2a_payment_status = 'approved',
        u2a_payment_approved_at = NOW(),
        u2a_payment_metadata = jsonb_set(
            COALESCE(u2a_payment_metadata, '{}'),
            '{approved_at}',
            to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE pi_payment_id = p_payment_id
    RETURNING * INTO v_sale;

    -- Update payment attempt
    UPDATE u2a_payment_attempts SET
        status = 'approved',
        approved_at = NOW()
    WHERE original_payment_id = p_payment_id
      AND status = 'initiated';

    RETURN v_sale;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE WARNING 'Failed to approve U2A payment: %', SQLERRM;
        RAISE;
END;
$$;

-- Function to complete U2A payment
CREATE OR REPLACE FUNCTION complete_u2a_payment(
    p_payment_id VARCHAR(255),
    p_txid VARCHAR(255),
    p_confirmation_count INTEGER DEFAULT 0
)
RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale RECORD;
BEGIN
    -- Get sale by payment ID
    SELECT * INTO v_sale FROM sales WHERE pi_payment_id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;

    -- Validate payment can be completed
    IF v_sale.u2a_payment_status != 'approved' THEN
        RAISE EXCEPTION 'Payment must be approved before completion. Current status: %', v_sale.u2a_payment_status;
    END IF;

    -- Update sale with completion
    UPDATE sales SET
        u2a_payment_status = 'completed',
        u2a_payment_completed_at = NOW(),
        u2a_blockchain_txid = p_txid,
        u2a_blockchain_confirmed_at = NOW(),
        u2a_payment_metadata = jsonb_set(
            COALESCE(u2a_payment_metadata, '{}'),
            '{completed_at}',
            to_jsonb(NOW())
        ),
        pi_transaction_id = p_txid,
        payment_status = 'completed',
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE pi_payment_id = p_payment_id
    RETURNING * INTO v_sale;

    -- Update payment attempt
    UPDATE u2a_payment_attempts SET
        status = 'completed',
        completed_at = NOW(),
        blockchain_txid = p_txid,
        blockchain_confirmed_at = NOW(),
        confirmation_count = p_confirmation_count
    WHERE original_payment_id = p_payment_id
      AND status = 'approved';

    RETURN v_sale;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE WARNING 'Failed to complete U2A payment: %', SQLERRM;
        RAISE;
END;
$$;

-- Function to fail U2A payment
CREATE OR REPLACE FUNCTION fail_u2a_payment(
    p_payment_id VARCHAR(255),
    p_error_code VARCHAR(50),
    p_error_message TEXT
)
RETURNS sales
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale RECORD;
BEGIN
    -- Get sale by payment ID
    SELECT * INTO v_sale FROM sales WHERE pi_payment_id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;

    -- Update sale with failure
    UPDATE sales SET
        u2a_payment_status = 'failed',
        u2a_payment_metadata = jsonb_set(
            COALESCE(u2a_payment_metadata, '{}'),
            '{failed_at}',
            to_jsonb(NOW())
        ),
        u2a_payment_metadata = jsonb_set(
            u2a_payment_metadata,
            '{error_code}',
            to_jsonb(p_error_code)
        ),
        u2a_payment_metadata = jsonb_set(
            u2a_payment_metadata,
            '{error_message}',
            to_jsonb(p_error_message)
        ),
        u2a_retry_count = u2a_retry_count + 1,
        u2a_last_retry_at = NOW(),
        updated_at = NOW()
    WHERE pi_payment_id = p_payment_id
    RETURNING * INTO v_sale;

    -- Update payment attempt
    UPDATE u2a_payment_attempts SET
        status = 'failed',
        failed_at = NOW(),
        error_code = p_error_code,
        error_message = p_error_message,
        retry_count = retry_count + 1,
        last_retry_at = NOW()
    WHERE original_payment_id = p_payment_id
      AND status IN ('initiated', 'approved', 'processing');

    RETURN v_sale;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE WARNING 'Failed to mark U2A payment as failed: %', SQLERRM;
        RAISE;
END;
$$;

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS u2a_payment_attempts_select_policy ON u2a_payment_attempts;
DROP POLICY IF EXISTS u2a_payment_attempts_insert_policy ON u2a_payment_attempts;
DROP POLICY IF EXISTS u2a_payment_attempts_update_policy ON u2a_payment_attempts;
DROP POLICY IF EXISTS u2a_payment_attempts_delete_policy ON u2a_payment_attempts;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE u2a_payment_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES FOR U2A PAYMENTS
-- ============================================================================

-- U2A PAYMENT ATTEMPTS TABLE POLICIES
CREATE POLICY u2a_payment_attempts_select_policy ON u2a_payment_attempts
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY u2a_payment_attempts_insert_policy ON u2a_payment_attempts
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY u2a_payment_attempts_update_policy ON u2a_payment_attempts
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY u2a_payment_attempts_delete_policy ON u2a_payment_attempts
  FOR DELETE
  TO mypipos_app
  USING (false);  -- Prevent direct deletion, use status updates instead

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS FOR ADMIN OPERATIONS
-- ============================================================================

-- Function to get U2A payment statistics (admin only)
CREATE OR REPLACE FUNCTION get_u2a_payment_stats(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    u2a_payment_type VARCHAR(50),
    u2a_payment_status VARCHAR(50),
    payment_count BIGINT,
    total_amount DECIMAL(20,7),
    average_amount DECIMAL(20,7),
    min_amount DECIMAL(15,7),
    max_amount DECIMAL(15,7),
    first_payment TIMESTAMP WITH TIME ZONE,
    last_payment TIMESTAMP WITH TIME ZONE,
    completed_count BIGINT,
    failed_count BIGINT,
    success_rate DECIMAL(5,2)
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        u2a_payment_type,
        u2a_payment_status,
        COUNT(*) as payment_count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as average_amount,
        COALESCE(MIN(total_amount), 0) as min_amount,
        COALESCE(MAX(total_amount), 0) as max_amount,
        MIN(u2a_payment_initiated_at) as first_payment,
        MAX(u2a_payment_initiated_at) as last_payment,
        COUNT(*) FILTER (WHERE u2a_payment_status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE u2a_payment_status = 'failed') as failed_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE u2a_payment_status = 'completed') / NULLIF(COUNT(*), 0), 2) as success_rate
    FROM sales
    WHERE u2a_payment_type IS NOT NULL
      AND u2a_payment_initiated_at >= p_start_date
      AND u2a_payment_initiated_at <= p_end_date
    GROUP BY u2a_payment_type, u2a_payment_status
    ORDER BY total_amount DESC;
$$;

-- Function to get U2A payment audit trail
CREATE OR REPLACE FUNCTION get_u2a_payment_audit_trail(p_payment_id VARCHAR(255))
RETURNS TABLE (
    action VARCHAR(50),
    sale_id UUID,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP WITH TIME ZONE,
    payment_metadata JSONB
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        'PAYMENT_INITIATED' as action,
        s.id as sale_id,
        NULL as old_status,
        s.u2a_payment_status as new_status,
        s.u2a_payment_initiated_at as changed_at,
        s.u2a_payment_metadata
    FROM sales s
    WHERE s.pi_payment_id = p_payment_id

    UNION ALL

    SELECT
        'STATUS_UPDATE' as action,
        s.id as sale_id,
        NULL as old_status,
        s.u2a_payment_status as new_status,
        s.updated_at as changed_at,
        s.u2a_payment_metadata
    FROM sales s
    WHERE s.pi_payment_id = p_payment_id
      AND s.updated_at > s.u2a_payment_initiated_at;
$$;

-- Function to get U2A payment attempts by sale
CREATE OR REPLACE FUNCTION get_u2a_payment_attempts(p_sale_id UUID)
RETURNS TABLE (
    attempt_number VARCHAR(100),
    payment_id VARCHAR(255),
    status VARCHAR(50),
    initiated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    blockchain_txid VARCHAR(255),
    error_message TEXT,
    retry_count INTEGER
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        a.attempt_number,
        a.original_payment_id as payment_id,
        a.status,
        a.initiated_at,
        a.completed_at,
        a.blockchain_txid,
        a.error_message,
        a.retry_count
    FROM u2a_payment_attempts a
    WHERE a.sale_id = p_sale_id
    ORDER BY a.initiated_at DESC;
$$;

-- ============================================================================
-- GRANT PERMISSIONS TO mypipos_app ROLE
-- ============================================================================

-- Grant execute permissions on all security definer functions
GRANT EXECUTE ON FUNCTION get_u2a_payment_by_sale(UUID) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payment_by_payment_id(VARCHAR(255)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payment_by_txid(VARCHAR(255)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payments_by_customer(UUID, INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payments_by_merchant(UUID, INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payments_by_status(VARCHAR(50), INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_active_u2a_payments(INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_expired_u2a_payments(INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION initiate_u2a_payment(UUID, VARCHAR(255), INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION approve_u2a_payment(VARCHAR(255), UUID) TO mypipos_app;
GRANT EXECUTE ON FUNCTION complete_u2a_payment(VARCHAR(255), VARCHAR(255), INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION fail_u2a_payment(VARCHAR(255), VARCHAR(50), TEXT) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payment_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payment_audit_trail(VARCHAR(255)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_u2a_payment_attempts(UUID) TO mypipos_app;

-- Grant execute on helper functions from migration 009
GRANT EXECUTE ON FUNCTION generate_u2a_attempt_number() TO mypipos_app;
GRANT EXECUTE ON FUNCTION create_u2a_payment_attempt(UUID, VARCHAR(255), DECIMAL(15,7), VARCHAR(50), INTEGER) TO mypipos_app;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_u2a_payment_by_sale IS 'Get U2A payment by sale ID with SECURITY DEFINER';
COMMENT ON FUNCTION initiate_u2a_payment IS 'Initiate U2A payment with validation and error handling';
COMMENT ON FUNCTION approve_u2a_payment IS 'Approve U2A payment after customer authorization';
COMMENT ON FUNCTION complete_u2a_payment IS 'Complete U2A payment with blockchain confirmation';
COMMENT ON FUNCTION fail_u2a_payment IS 'Mark U2A payment as failed with error details';
COMMENT ON FUNCTION get_u2a_payment_stats IS 'Get U2A payment statistics for admin dashboard';
COMMENT ON FUNCTION get_u2a_payment_audit_trail IS 'Get complete audit trail for U2A payment';
COMMENT ON FUNCTION get_u2a_payment_attempts IS 'Get all payment attempts for a sale';

COMMENT ON TABLE u2a_payment_attempts IS 'U2A payment attempt records with RLS enabled - uses SECURITY DEFINER functions for access';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
SELECT
    'U2A payment attempts RLS enabled' as check_result,
    CASE WHEN relrowsecurity = true THEN 'YES' ELSE 'NO' END as rls_status
FROM pg_class
WHERE relname = 'u2a_payment_attempts';

-- Verify policies created
SELECT
    'U2A payment attempts policies created' as check_result,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'u2a_payment_attempts';

-- Verify SECURITY DEFINER functions created
SELECT
    'U2A SECURITY DEFINER functions created' as check_result,
    COUNT(*) as function_count
FROM pg_proc
WHERE proname LIKE 'u2a%' AND prosecdef = true;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration, uncomment and run:
-- REVOKE ALL ON FUNCTION get_u2a_payment_by_sale(UUID) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION initiate_u2a_payment(UUID, VARCHAR(255), INTEGER) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION approve_u2a_payment(VARCHAR(255), UUID) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION complete_u2a_payment(VARCHAR(255), VARCHAR(255), INTEGER) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION fail_u2a_payment(VARCHAR(255), VARCHAR(50), TEXT) FROM mypipos_app;
-- DROP FUNCTION IF EXISTS get_u2a_payment_attempts(UUID);
-- DROP FUNCTION IF EXISTS get_u2a_payment_audit_trail(VARCHAR(255));
-- DROP FUNCTION IF EXISTS get_u2a_payment_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
-- DROP FUNCTION IF EXISTS fail_u2a_payment(VARCHAR(255), VARCHAR(50), TEXT);
-- DROP FUNCTION IF EXISTS complete_u2a_payment(VARCHAR(255), VARCHAR(255), INTEGER);
-- DROP FUNCTION IF EXISTS approve_u2a_payment(VARCHAR(255), UUID);
-- DROP FUNCTION IF EXISTS initiate_u2a_payment(UUID, VARCHAR(255), INTEGER);
-- DROP FUNCTION IF EXISTS get_expired_u2a_payments(INTEGER);
-- DROP FUNCTION IF EXISTS get_active_u2a_payments(INTEGER);
-- DROP FUNCTION IF EXISTS get_u2a_payments_by_status(VARCHAR(50), INTEGER);
-- DROP FUNCTION IF EXISTS get_u2a_payments_by_merchant(UUID, INTEGER);
-- DROP FUNCTION IF EXISTS get_u2a_payments_by_customer(UUID, INTEGER);
-- DROP FUNCTION IF EXISTS get_u2a_payment_by_txid(VARCHAR(255));
-- DROP FUNCTION IF EXISTS get_u2a_payment_by_payment_id(VARCHAR(255));
-- DROP POLICY IF EXISTS u2a_payment_attempts_delete_policy ON u2a_payment_attempts;
-- DROP POLICY IF EXISTS u2a_payment_attempts_update_policy ON u2a_payment_attempts;
-- DROP POLICY IF EXISTS u2a_payment_attempts_insert_policy ON u2a_payment_attempts;
-- DROP POLICY IF EXISTS u2a_payment_attempts_select_policy ON u2a_payment_attempts;
-- ALTER TABLE u2a_payment_attempts DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 010
-- ============================================================================