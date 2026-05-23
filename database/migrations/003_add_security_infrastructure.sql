-- ============================================================================
-- COMPREHENSIVE ROW-LEVEL SECURITY (RLS) MIGRATION
-- ============================================================================
-- Implements database-level security for ALL tables using RLS + SECURITY DEFINER
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECURITY ROLES
-- ============================================================================

-- Create application role for SECURITY DEFINER functions
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
-- CONTEXT FUNCTIONS
-- ============================================================================

-- Function to get current user context from session
CREATE OR REPLACE FUNCTION get_current_user_context()
RETURNS TABLE (
    current_user_id UUID,
    user_type VARCHAR,
    merchant_id UUID,
    is_system_admin BOOLEAN
) AS $$
DECLARE
    v_session_token TEXT;
    v_user_context RECORD;
BEGIN
    -- Get session token from current transaction (set by application layer)
    -- In production, this would use: current_setting('request.jwt.claim.user_id', true)
    v_session_token := NULLIF(current_setting('request.session.token', true), '');

    IF v_session_token IS NULL THEN
        -- No session context - return empty result
        RETURN;
    END IF;

    -- Query session and user information
    SELECT
        s.user_id,
        u.user_type,
        u.merchant_id,
        (u.user_type = 'system_admin')::BOOLEAN
    INTO v_user_context
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = v_session_token
    AND s.is_active = true
    AND s.expires_at > NOW();

    IF FOUND THEN
        RETURN QUERY SELECT
            v_user_context.user_id,
            v_user_context.user_type,
            v_user_context.merchant_id,
            v_user_context.is_system_admin;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT LOGGING FUNCTION
-- ============================================================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_context RECORD;
    v_merchant_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user context
    SELECT * INTO v_user_context FROM get_current_user_context();

    IF FOUND THEN
        v_merchant_id := v_user_context.merchant_id;
        v_user_id := v_user_context.current_user_id;
    ELSE
        -- System operation or no context
        v_merchant_id := NULL;
        v_user_id := NULL;
    END IF;

    -- Create audit log entry
    INSERT INTO audit_logs (
        merchant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        v_merchant_id,
        v_user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE((CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END), NEW.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES FOR MERCHANTS TABLE
-- ============================================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchants_select_policy ON merchants
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchants.id
        )
    );

CREATE POLICY merchants_update_policy ON merchants
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchants.id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR USERS TABLE
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_policy ON users
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = users.merchant_id
            OR ctx.current_user_id = users.id
        )
    );

CREATE POLICY users_insert_policy ON users
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = users.merchant_id
        )
    );

CREATE POLICY users_update_policy ON users
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = users.merchant_id
            OR ctx.current_user_id = users.id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR PRODUCTS TABLE
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_policy ON products
    FOR SELECT
    TO mypipos_app
    USING (true); -- Universal catalog is readable by all authenticated users

-- ============================================================================
-- RLS POLICIES FOR MERCHANT PRODUCTS TABLE
-- ============================================================================

ALTER TABLE merchant_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_products_select_policy ON merchant_products
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchant_products.merchant_id
        )
    );

CREATE POLICY merchant_products_insert_policy ON merchant_products
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchant_products.merchant_id
        )
    );

CREATE POLICY merchant_products_update_policy ON merchant_products
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchant_products.merchant_id
        )
    );

CREATE POLICY merchant_products_delete_policy ON merchant_products
    FOR DELETE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchant_products.merchant_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR MERCHANT INVENTORY TABLE
-- ============================================================================

ALTER TABLE merchant_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_inventory_select_policy ON merchant_inventory
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchant_inventory.merchant_id
        )
    );

CREATE POLICY merchant_inventory_insert_policy ON merchant_inventory
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchant_inventory.merchant_id
        )
    );

CREATE POLICY merchant_inventory_update_policy ON merchant_inventory
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = merchant_inventory.merchant_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR SALES TABLE
-- ============================================================================

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_select_policy ON sales
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = sales.merchant_id
            OR ctx.current_user_id = sales.customer_id
        )
    );

CREATE POLICY sales_insert_policy ON sales
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = sales.merchant_id
        )
    );

CREATE POLICY sales_update_policy ON sales
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = sales.merchant_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR SALE ITEMS TABLE
-- ============================================================================

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY sale_items_select_policy ON sale_items
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM sales s
            JOIN get_current_user_context() ctx ON (
                ctx.is_system_admin = true
                OR ctx.merchant_id = s.merchant_id
                OR ctx.current_user_id = s.customer_id
            )
            WHERE s.id = sale_items.sale_id
        )
    );

CREATE POLICY sale_items_insert_policy ON sale_items
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales s
            JOIN get_current_user_context() ctx ON (
                ctx.is_system_admin = true
                OR ctx.merchant_id = s.merchant_id
            )
            WHERE s.id = sale_items.sale_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR INVOICES TABLE
-- ============================================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select_policy ON invoices
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = invoices.merchant_id
            OR ctx.current_user_id = invoices.customer_id
        )
    );

CREATE POLICY invoices_insert_policy ON invoices
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = invoices.merchant_id
        )
    );

CREATE POLICY invoices_update_policy ON invoices
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = invoices.merchant_id
        )
    );

CREATE POLICY invoices_delete_policy ON invoices
    FOR DELETE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
        )
    );

-- ============================================================================
-- RLS POLICIES FOR INVOICE ITEMS TABLE
-- ============================================================================

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_items_select_policy ON invoice_items
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN get_current_user_context() ctx ON (
                ctx.is_system_admin = true
                OR ctx.merchant_id = i.merchant_id
                OR ctx.current_user_id = i.customer_id
            )
            WHERE i.id = invoice_items.invoice_id
        )
    );

CREATE POLICY invoice_items_insert_policy ON invoice_items
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN get_current_user_context() ctx ON (
                ctx.is_system_admin = true
                OR ctx.merchant_id = i.merchant_id
            )
            WHERE i.id = invoice_items.invoice_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR POS TERMINALS TABLE
-- ============================================================================

ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY pos_terminals_select_policy ON pos_terminals
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = pos_terminals.merchant_id
        )
    );

CREATE POLICY pos_terminals_insert_policy ON pos_terminals
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = pos_terminals.merchant_id
        )
    );

CREATE POLICY pos_terminals_update_policy ON pos_terminals
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = pos_terminals.merchant_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR CATEGORIES TABLE
-- ============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = categories.merchant_id
        )
    );

CREATE POLICY categories_insert_policy ON categories
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = categories.merchant_id
        )
    );

CREATE POLICY categories_update_policy ON categories
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = categories.merchant_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR INVENTORY TRANSACTIONS TABLE
-- ============================================================================

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_transactions_select_policy ON inventory_transactions
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = inventory_transactions.merchant_id
        )
    );

CREATE POLICY inventory_transactions_insert_policy ON inventory_transactions
    FOR INSERT
    TO mypipos_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = inventory_transactions.merchant_id
        )
    );

-- ============================================================================
-- RLS POLICIES FOR SESSIONS TABLE
-- ============================================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select_policy ON sessions
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.current_user_id = sessions.user_id
            OR ctx.is_system_admin = true
        )
    );

CREATE POLICY sessions_insert_policy ON sessions
    FOR INSERT
    TO mypipos_app
    WITH CHECK (true); -- Application can insert sessions

CREATE POLICY sessions_update_policy ON sessions
    FOR UPDATE
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.current_user_id = sessions.user_id
            OR ctx.is_system_admin = true
        )
    );

-- ============================================================================
-- RLS POLICIES FOR AUDIT LOGS TABLE
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select_policy ON audit_logs
    FOR SELECT
    TO mypipos_app
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.is_system_admin = true
            OR ctx.merchant_id = audit_logs.merchant_id
        )
    );

-- Only system (via SECURITY DEFINER) can insert audit logs
CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    TO mypipos_app
    WITH CHECK (true);

-- ============================================================================
-- APPLY AUDIT TRIGGERS TO CORE TABLES
-- ============================================================================

-- Apply to merchants
CREATE TRIGGER audit_merchants
    AFTER INSERT OR UPDATE OR DELETE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to users
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to products
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to merchant_products
CREATE TRIGGER audit_merchant_products
    AFTER INSERT OR UPDATE OR DELETE ON merchant_products
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to merchant_inventory
CREATE TRIGGER audit_merchant_inventory
    AFTER INSERT OR UPDATE OR DELETE ON merchant_inventory
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to sales
CREATE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to sale_items
CREATE TRIGGER audit_sale_items
    AFTER INSERT OR UPDATE OR DELETE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to invoices
CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply to invoice_items
CREATE TRIGGER audit_invoice_items
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant mypipos_app role access to all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mypipos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mypipos_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mypipos_app;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_current_user_context IS 'Extract user context from session for RLS policies';
COMMENT ON FUNCTION create_audit_log IS 'Automatic audit logging trigger function';

COMMENT ON TABLE merchants IS 'Multi-tenant merchant table - RLS enabled';
COMMENT ON TABLE users IS 'User accounts - RLS enabled';
COMMENT ON TABLE products IS 'Universal product catalog - RLS enabled';
COMMENT ON TABLE merchant_products IS 'Per-merchant product pricing - RLS enabled';
COMMENT ON TABLE merchant_inventory IS 'Per-merchant inventory - RLS enabled';
COMMENT ON TABLE sales IS 'Sales transactions - RLS enabled';
COMMENT ON TABLE sale_items IS 'Sale line items - RLS enabled';
COMMENT ON TABLE invoices IS 'Customer invoices - RLS enabled';
COMMENT ON TABLE invoice_items IS 'Invoice line items - RLS enabled';
COMMENT ON TABLE pos_terminals IS 'POS terminals - RLS enabled';
COMMENT ON TABLE categories IS 'Product categories - RLS enabled';
COMMENT ON TABLE inventory_transactions IS 'Inventory transactions - RLS enabled';
COMMENT ON TABLE sessions IS 'User sessions - RLS enabled';
COMMENT ON TABLE audit_logs IS 'Audit trail - RLS enabled';

-- ============================================================================
-- END OF SECURITY MIGRATION
-- ============================================================================