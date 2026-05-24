-- ============================================================================
-- Migration 008: A2U Payment Security (RLS + SECURITY DEFINER)
-- ============================================================================
-- Description: Adds RLS policies and SECURITY DEFINER functions for A2U payments
--              Follows security patterns from migration 004
-- Author: A2U Implementation
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
-- SECURITY DEFINER FUNCTIONS FOR A2U PAYMENTS
-- ============================================================================

-- Function to get A2U payment by ID
CREATE OR REPLACE FUNCTION get_a2u_payment_by_id(p_payment_id UUID)
RETURNS a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM a2u_payments WHERE id = p_payment_id;
$$;

-- Function to get A2U payment by transaction number
CREATE OR REPLACE FUNCTION get_a2u_payment_by_transaction_number(p_transaction_number VARCHAR(100))
RETURNS a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM a2u_payments WHERE transaction_number = p_transaction_number;
$$;

-- Function to get A2U payment by Pi Network payment ID
CREATE OR REPLACE FUNCTION get_a2u_payment_by_payment_id(p_payment_id VARCHAR(255))
RETURNS a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM a2u_payments WHERE payment_id = p_payment_id;
$$;

-- Function to get A2U payments by user
CREATE OR REPLACE FUNCTION get_a2u_payments_by_user(p_to_user_id UUID, p_limit INTEGER DEFAULT 100)
RETURNS SETOF a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM a2u_payments
  WHERE to_user_id = p_to_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Function to get A2U payments by type
CREATE OR REPLACE FUNCTION get_a2u_payments_by_type(p_transaction_type VARCHAR(50), p_limit INTEGER DEFAULT 100)
RETURNS SETOF a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM a2u_payments
  WHERE transaction_type = p_transaction_type
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Function to get pending A2U payments
CREATE OR REPLACE FUNCTION get_pending_a2u_payments(p_limit INTEGER DEFAULT 100)
RETURNS SETOF a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT * FROM a2u_payments
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT p_limit;
$$;

-- Function to create A2U payment (enhanced with error handling)
CREATE OR REPLACE FUNCTION create_a2u_payment_secure(
    p_to_user_id UUID,
    p_to_user_type VARCHAR(50),
    p_amount DECIMAL(15,7),
    p_memo TEXT,
    p_transaction_type VARCHAR(50),
    p_metadata JSONB DEFAULT '{}',
    p_related_sale_id UUID DEFAULT NULL,
    p_from_address VARCHAR(255) DEFAULT NULL
)
RETURNS a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment_id UUID;
    v_transaction_number VARCHAR(100);
    v_user_record users;
BEGIN
    -- Validate inputs
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;

    IF p_to_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    IF p_transaction_type NOT IN ('merchant_payout', 'customer_refund', 'customer_reward', 'staff_payout', 'affiliate_payout', 'platform_payout') THEN
        RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
    END IF;

    -- Get user details and validate user exists
    SELECT * INTO v_user_record FROM users WHERE id = p_to_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_to_user_id;
    END IF;

    -- Generate transaction number
    v_transaction_number := generate_a2u_transaction_number();

    -- Create A2U payment record
    INSERT INTO a2u_payments (
        transaction_number,
        payment_id,
        to_user_id,
        to_user_type,
        to_user_username,
        to_user_pi_uid,
        amount,
        memo,
        transaction_type,
        metadata,
        related_sale_id,
        from_address,
        to_address,
        status
    )
    VALUES (
        v_transaction_number,
        'PENDING-' || v_transaction_number, -- Will be updated with actual Pi Network payment ID
        v_user_record.id,
        p_to_user_type,
        v_user_record.username,
        v_user_record.pi_uid,
        p_amount,
        p_memo,
        p_transaction_type,
        p_metadata,
        p_related_sale_id,
        p_from_address,
        v_user_record.pi_wallet_address,
        'pending'
    )
    RETURNING * INTO v_payment_id;

    RETURN v_payment_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE WARNING 'Failed to create A2U payment: %', SQLERRM;
        RAISE;
END;
$$;

-- Function to update A2U payment status
CREATE OR REPLACE FUNCTION update_a2u_payment_status(
    p_payment_id UUID,
    p_new_status VARCHAR(50),
    p_txid VARCHAR(255) DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment a2u_payments;
BEGIN
    -- Validate status transition
    IF p_new_status NOT IN ('pending', 'creating', 'submitting', 'completing', 'completed', 'failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid payment status: %', p_new_status;
    END IF;

    -- Get current payment record
    SELECT * INTO v_payment FROM a2u_payments WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;

    -- Update payment status
    UPDATE a2u_payments SET
        status = p_new_status,
        txid = COALESCE(p_txid, txid),
        error_message = COALESCE(p_error_message, error_message),
        updated_at = NOW(),
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END,
        retry_count = CASE WHEN p_new_status = 'failed' THEN retry_count + 1 ELSE retry_count END,
        last_retry_at = CASE WHEN p_new_status = 'failed' THEN NOW() ELSE last_retry_at END
    WHERE id = p_payment_id
    RETURNING * INTO v_payment;

    RETURN v_payment;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to update A2U payment status: %', SQLERRM;
        RAISE;
END;
$$;

-- Function to process merchant payout from sale
CREATE OR REPLACE FUNCTION process_merchant_payout(
    p_sale_id UUID,
    p_payout_amount DECIMAL(15,7),
    p_payment_id VARCHAR(255),
    p_txid VARCHAR(255)
)
RETURNS a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale RECORD;
    v_payment a2u_payments;
BEGIN
    -- Get sale details with merchant information
    SELECT
        s.*,
        u.username as merchant_username,
        u.pi_uid as merchant_pi_uid,
        u.pi_wallet_address as merchant_wallet
    INTO v_sale
    FROM sales s
    JOIN users u ON s.merchant_id = u.id
    WHERE s.id = p_sale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found: %', p_sale_id;
    END IF;

    -- Validate payout amount doesn't exceed merchant_payout
    IF p_payout_amount > v_sale.merchant_payout THEN
        RAISE EXCEPTION 'Payout amount % exceeds available merchant payout %',
            p_payout_amount, v_sale.merchant_payout;
    END IF;

    -- Create A2U payment for merchant payout
    INSERT INTO a2u_payments (
        transaction_number,
        payment_id,
        txid,
        to_user_id,
        to_user_type,
        to_user_username,
        to_user_pi_uid,
        amount,
        memo,
        transaction_type,
        metadata,
        related_sale_id,
        from_address,
        to_address,
        network,
        status,
        payment_completed_at,
        completed_at
    )
    SELECT
        generate_a2u_transaction_number(),
        p_payment_id,
        p_txid,
        v_sale.merchant_id,
        'merchant',
        v_sale.merchant_username,
        v_sale.merchant_pi_uid,
        p_payout_amount,
        'Merchant payout for sale #' || v_sale.transaction_number,
        'merchant_payout',
        jsonb_build_object(
            'sale_id', v_sale.id,
            'transaction_number', v_sale.transaction_number,
            'sale_amount', v_sale.total_amount,
            'platform_fee', v_sale.platform_fee,
            'payout_percentage', ROUND((p_payout_amount / v_sale.merchant_payout * 100), 2)
        ),
        v_sale.id,
        NULL, -- from_address - platform wallet
        v_sale.merchant_wallet,
        'Pi Testnet',
        'completed',
        NOW(),
        NOW()
    RETURNING * INTO v_payment;

    -- Update sale record with merchant payout details
    UPDATE sales SET
        a2u_merchant_payout_id = p_payment_id,
        a2u_merchant_payout_txid = p_txid,
        a2u_merchant_payout_status = 'completed',
        a2u_merchant_payout_amount = p_payout_amount,
        a2u_merchant_payout_completed_at = NOW()
    WHERE id = p_sale_id;

    RETURN v_payment;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to process merchant payout: %', SQLERRM;
        RAISE;
END;
$$;

-- Function to process customer refund
CREATE OR REPLACE FUNCTION process_customer_refund(
    p_sale_id UUID,
    p_refund_amount DECIMAL(15,7),
    p_refund_reason TEXT,
    p_payment_id VARCHAR(255),
    p_txid VARCHAR(255)
)
RETURNS a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sale RECORD;
    v_payment a2u_payments;
BEGIN
    -- Get sale details with customer information
    SELECT
        s.*,
        u.username as customer_username,
        u.pi_uid as customer_pi_uid,
        u.pi_wallet_address as customer_wallet
    INTO v_sale
    FROM sales s
    JOIN users u ON s.customer_id = u.id
    WHERE s.id = p_sale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale not found: %', p_sale_id;
    END IF;

    -- Validate refund amount doesn't exceed total sale amount
    IF p_refund_amount > v_sale.total_amount THEN
        RAISE EXCEPTION 'Refund amount % exceeds total sale amount %',
            p_refund_amount, v_sale.total_amount;
    END IF;

    -- Create A2U payment for customer refund
    INSERT INTO a2u_payments (
        transaction_number,
        payment_id,
        txid,
        to_user_id,
        to_user_type,
        to_user_username,
        to_user_pi_uid,
        amount,
        memo,
        transaction_type,
        metadata,
        related_sale_id,
        from_address,
        to_address,
        network,
        status,
        payment_completed_at,
        completed_at
    )
    SELECT
        generate_a2u_transaction_number(),
        p_payment_id,
        p_txid,
        v_sale.customer_id,
        'customer',
        v_sale.customer_username,
        v_sale.customer_pi_uid,
        p_refund_amount,
        'Refund for sale #' || v_sale.transaction_number || ': ' || p_refund_reason,
        'customer_refund',
        jsonb_build_object(
            'sale_id', v_sale.id,
            'transaction_number', v_sale.transaction_number,
            'sale_amount', v_sale.total_amount,
            'refund_reason', p_refund_reason,
            'refund_percentage', ROUND((p_refund_amount / v_sale.total_amount * 100), 2)
        ),
        v_sale.id,
        NULL, -- from_address - platform wallet
        v_sale.customer_wallet,
        'Pi Testnet',
        'completed',
        NOW(),
        NOW()
    RETURNING * INTO v_payment;

    -- Update sale record with refund details
    UPDATE sales SET
        a2u_refund_id = p_payment_id,
        a2u_refund_txid = p_txid,
        a2u_refund_status = 'completed',
        a2u_refund_amount = p_refund_amount,
        a2u_refund_completed_at = NOW()
    WHERE id = p_sale_id;

    RETURN v_payment;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to process customer refund: %', SQLERRM;
        RAISE;
END;
$$;

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS a2u_payments_select_policy ON a2u_payments;
DROP POLICY IF EXISTS a2u_payments_insert_policy ON a2u_payments;
DROP POLICY IF EXISTS a2u_payments_update_policy ON a2u_payments;
DROP POLICY IF EXISTS a2u_payments_delete_policy ON a2u_payments;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE a2u_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES FOR A2U PAYMENTS
-- ============================================================================

-- A2U PAYMENTS TABLE POLICIES
CREATE POLICY a2u_payments_select_policy ON a2u_payments
  FOR SELECT
  TO mypipos_app
  USING (true);

CREATE POLICY a2u_payments_insert_policy ON a2u_payments
  FOR INSERT
  TO mypipos_app
  WITH CHECK (true);

CREATE POLICY a2u_payments_update_policy ON a2u_payments
  FOR UPDATE
  TO mypipos_app
  USING (true)
  WITH CHECK (true);

CREATE POLICY a2u_payments_delete_policy ON a2u_payments
  FOR DELETE
  TO mypipos_app
  USING (false);  -- Prevent direct deletion, use status updates instead

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS FOR ADMIN OPERATIONS
-- ============================================================================

-- Function to get A2U payment statistics (admin only)
CREATE OR REPLACE FUNCTION get_a2u_payment_stats(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS SETOF a2u_payments
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        to_user_type,
        transaction_type,
        status,
        COUNT(*) as payment_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as average_amount,
        COALESCE(MIN(amount), 0) as min_amount,
        COALESCE(MAX(amount), 0) as max_amount,
        MIN(created_at) as first_payment,
        MAX(created_at) as last_payment
    FROM a2u_payments
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY to_user_type, transaction_type, status
    ORDER BY total_amount DESC;
$$;

-- Function to get pending merchant payouts
CREATE OR REPLACE FUNCTION get_pending_merchant_payouts(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    sale_id UUID,
    transaction_number VARCHAR(100),
    merchant_id UUID,
    merchant_username VARCHAR(100),
    merchant_wallet VARCHAR(255),
    payout_amount DECIMAL(15,7),
    sale_created_at TIMESTAMP WITH TIME ZONE
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as sale_id,
        s.transaction_number,
        s.merchant_id,
        u.username as merchant_username,
        u.pi_wallet_address as merchant_wallet,
        s.merchant_payout as payout_amount,
        s.created_at as sale_created_at
    FROM sales s
    JOIN users u ON s.merchant_id = u.id
    WHERE s.a2u_merchant_payout_status = 'pending'
      AND s.status = 'completed'
      AND s.payment_status = 'completed'
      AND s.merchant_payout > 0
    ORDER BY s.created_at ASC
    LIMIT p_limit;
END;
$$;

-- Function to get A2U payment audit trail
CREATE OR REPLACE FUNCTION get_a2u_payment_audit_trail(p_payment_id UUID)
RETURNS TABLE (
    action VARCHAR(50),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by UUID,
    error_message TEXT
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
BEGIN
    RETURN QUERY
    SELECT
        'CREATED' as action,
        NULL as old_status,
        ap.status as new_status,
        ap.created_at as changed_at,
        ap.created_by as changed_by,
        ap.error_message
    FROM a2u_payments ap
    WHERE ap.id = p_payment_id

    UNION ALL

    SELECT
        'STATUS_UPDATE' as action,
        NULL as old_status,
        ap.status as new_status,
        ap.updated_at as changed_at,
        NULL::UUID as changed_by,
        ap.error_message
    FROM a2u_payments ap
    WHERE ap.id = p_payment_id AND ap.updated_at > ap.created_at;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS TO mypipos_app ROLE
-- ============================================================================

-- Grant execute permissions on all security definer functions
GRANT EXECUTE ON FUNCTION get_a2u_payment_by_id(UUID) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_a2u_payment_by_transaction_number(VARCHAR(100)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_a2u_payment_by_payment_id(VARCHAR(255)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_a2u_payments_by_user(UUID, INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_a2u_payments_by_type(VARCHAR(50), INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_pending_a2u_payments(INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION create_a2u_payment_secure(UUID, VARCHAR(50), DECIMAL(15,7), TEXT, VARCHAR(50), JSONB, UUID, VARCHAR(255)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION update_a2u_payment_status(UUID, VARCHAR(50), VARCHAR(255), TEXT) TO mypipos_app;
GRANT EXECUTE ON FUNCTION process_merchant_payout(UUID, DECIMAL(15,7), VARCHAR(255), VARCHAR(255)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION process_customer_refund(UUID, DECIMAL(15,7), TEXT, VARCHAR(255), VARCHAR(255)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_a2u_payment_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_pending_merchant_payouts(INTEGER) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_a2u_payment_audit_trail(UUID) TO mypipos_app;

-- Grant execute on helper function from migration 007
GRANT EXECUTE ON FUNCTION generate_a2u_transaction_number() TO mypipos_app;
GRANT EXECUTE ON FUNCTION create_a2u_payment(UUID, VARCHAR(50), DECIMAL(15,7), TEXT, VARCHAR(50), JSONB, UUID) TO mypipos_app;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_a2u_payment_by_id IS 'Get A2U payment by ID with SECURITY DEFINER';
COMMENT ON FUNCTION create_a2u_payment_secure IS 'Create A2U payment with validation and error handling';
COMMENT ON FUNCTION update_a2u_payment_status IS 'Update A2U payment status with validation';
COMMENT ON FUNCTION process_merchant_payout IS 'Process merchant payout from sale with full audit trail';
COMMENT ON FUNCTION process_customer_refund IS 'Process customer refund with full audit trail';
COMMENT ON FUNCTION get_a2u_payment_stats IS 'Get A2U payment statistics for admin dashboard';
COMMENT ON FUNCTION get_pending_merchant_payouts IS 'Get pending merchant payouts for batch processing';
COMMENT ON FUNCTION get_a2u_payment_audit_trail IS 'Get complete audit trail for A2U payment';

COMMENT ON TABLE a2u_payments IS 'A2U payment records with RLS enabled - uses SECURITY DEFINER functions for access';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
SELECT
    'A2U payments RLS enabled' as check_result,
    CASE WHEN relrowsecurity = true THEN 'YES' ELSE 'NO' END as rls_status
FROM pg_class
WHERE relname = 'a2u_payments';

-- Verify policies created
SELECT
    'A2U payments policies created' as check_result,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'a2u_payments';

-- Verify SECURITY DEFINER functions created
SELECT
    'A2U SECURITY DEFINER functions created' as check_result,
    COUNT(*) as function_count
FROM pg_proc
WHERE proname LIKE 'a2u%' AND prosecdef = true;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

-- To rollback this migration, uncomment and run:
-- REVOKE ALL ON FUNCTION get_a2u_payment_by_id(UUID) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION create_a2u_payment_secure(UUID, VARCHAR(50), DECIMAL(15,7), TEXT, VARCHAR(50), JSONB, UUID, VARCHAR(255)) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION update_a2u_payment_status(UUID, VARCHAR(50), VARCHAR(255), TEXT) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION process_merchant_payout(UUID, DECIMAL(15,7), VARCHAR(255), VARCHAR(255)) FROM mypipos_app;
-- REVOKE ALL ON FUNCTION process_customer_refund(UUID, DECIMAL(15,7), TEXT, VARCHAR(255), VARCHAR(255)) FROM mypipos_app;
-- DROP FUNCTION IF EXISTS get_a2u_payment_audit_trail(UUID);
-- DROP FUNCTION IF EXISTS get_pending_merchant_payouts(INTEGER);
-- DROP FUNCTION IF EXISTS get_a2u_payment_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
-- DROP FUNCTION IF EXISTS process_customer_refund(UUID, DECIMAL(15,7), TEXT, VARCHAR(255), VARCHAR(255));
-- DROP FUNCTION IF EXISTS process_merchant_payout(UUID, DECIMAL(15,7), VARCHAR(255), VARCHAR(255));
-- DROP FUNCTION IF EXISTS update_a2u_payment_status(UUID, VARCHAR(50), VARCHAR(255), TEXT);
-- DROP FUNCTION IF EXISTS create_a2u_payment_secure(UUID, VARCHAR(50), DECIMAL(15,7), TEXT, VARCHAR(50), JSONB, UUID, VARCHAR(255));
-- DROP FUNCTION IF EXISTS get_pending_a2u_payments(INTEGER);
-- DROP FUNCTION IF EXISTS get_a2u_payments_by_type(VARCHAR(50), INTEGER);
-- DROP FUNCTION IF EXISTS get_a2u_payments_by_user(UUID, INTEGER);
-- DROP FUNCTION IF EXISTS get_a2u_payment_by_payment_id(VARCHAR(255));
-- DROP FUNCTION IF EXISTS get_a2u_payment_by_transaction_number(VARCHAR(100));
-- DROP FUNCTION IF EXISTS get_a2u_payment_by_id(UUID);
-- DROP POLICY IF EXISTS a2u_payments_delete_policy ON a2u_payments;
-- DROP POLICY IF EXISTS a2u_payments_update_policy ON a2u_payments;
-- DROP POLICY IF EXISTS a2u_payments_insert_policy ON a2u_payments;
-- DROP POLICY IF EXISTS a2u_payments_select_policy ON a2u_payments;
-- ALTER TABLE a2u_payments DISABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- END OF MIGRATION 008
-- ============================================================================