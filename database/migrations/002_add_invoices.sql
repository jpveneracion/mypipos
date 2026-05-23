-- ============================================================================
-- INVOICES AND CUSTOMER PAYMENTS MIGRATION
-- ============================================================================
-- Adds customer invoice functionality with Pi Network payment integration
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- POS TERMINALS TABLE (must be created first before invoices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pos_terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

    -- Terminal details
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    terminal_code VARCHAR(50) UNIQUE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    pos_terminal_id UUID REFERENCES pos_terminals(id) ON DELETE SET NULL,

    -- Invoice status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('pi', 'cash', 'card')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),

    -- Pi Network payment details
    pi_payment_id VARCHAR(255),
    pi_transaction_id VARCHAR(255),

    -- Amounts (using NUMERIC(10,7) for Pi Network 7-decimal precision)
    subtotal NUMERIC(10,7) NOT NULL,
    tax NUMERIC(10,7) NOT NULL DEFAULT 0.0000000,
    total NUMERIC(10,7) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INVOICE ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,

    -- Product details (captured at time of invoice for historical accuracy)
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,7) NOT NULL,
    total_price NUMERIC(10,7) NOT NULL,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_merchant_id ON invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_pi_payment_id ON invoices(pi_payment_id) WHERE pi_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_merchant_status ON invoices(merchant_id, status);

-- Invoice items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

-- POS terminals indexes
CREATE INDEX IF NOT EXISTS idx_pos_terminals_merchant_id ON pos_terminals(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_is_active ON pos_terminals(is_active) WHERE is_active = true;

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;

-- Invoices table policies
CREATE POLICY invoices_select_policy ON invoices
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = invoices.merchant_id OR
                ctx.id = invoices.customer_id
            )
        )
    );

CREATE POLICY invoices_insert_policy ON invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = invoices.merchant_id
            )
        )
    );

CREATE POLICY invoices_update_policy ON invoices
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = invoices.merchant_id
            )
        )
    );

CREATE POLICY invoices_delete_policy ON invoices
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.user_type = 'system_admin'
        )
    );

-- Invoice items table policies
CREATE POLICY invoice_items_select_policy ON invoice_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN get_current_user_context() ctx ON (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = i.merchant_id OR
                ctx.id = i.customer_id
            )
            WHERE i.id = invoice_items.invoice_id
        )
    );

CREATE POLICY invoice_items_insert_policy ON invoice_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN get_current_user_context() ctx ON (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = i.merchant_id
            )
            WHERE i.id = invoice_items.invoice_id
        )
    );

-- POS terminals table policies
CREATE POLICY pos_terminals_select_policy ON pos_terminals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE (
                ctx.user_type = 'system_admin' OR
                ctx.merchant_id = pos_terminals.merchant_id
            )
        )
    );

CREATE POLICY pos_terminals_insert_policy ON pos_terminals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = pos_terminals.merchant_id
        )
    );

CREATE POLICY pos_terminals_update_policy ON pos_terminals
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_current_user_context() ctx
            WHERE ctx.merchant_id = pos_terminals.merchant_id
        )
    );

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Update updated_at timestamp on invoices
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on POS terminals
CREATE TRIGGER update_pos_terminals_updated_at
    BEFORE UPDATE ON pos_terminals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

-- Apply audit logging to invoices
CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Apply audit logging to invoice_items
CREATE TRIGGER audit_invoice_items
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Customer invoice summary view
CREATE VIEW customer_invoice_summary AS
SELECT
    i.id AS invoice_id,
    i.customer_id,
    i.merchant_id,
    m.business_name AS merchant_name,
    i.status,
    i.payment_status,
    i.payment_method,
    i.total,
    i.created_at,
    i.due_date,
    COUNT(ii.id) AS item_count
FROM invoices i
JOIN merchants m ON i.merchant_id = m.id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
GROUP BY
    i.id, i.customer_id, i.merchant_id, m.business_name,
    i.status, i.payment_status, i.payment_method, i.total, i.created_at, i.due_date
ORDER BY i.created_at DESC;

-- Merchant invoice analytics view
CREATE VIEW merchant_invoice_analytics AS
SELECT
    i.merchant_id,
    m.business_name,
    COUNT(i.id) AS total_invoices,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_invoices,
    COUNT(CASE WHEN i.status = 'pending' THEN 1 END) AS pending_invoices,
    COUNT(CASE WHEN i.payment_method = 'pi' THEN 1 END) AS pi_payments,
    SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) AS total_revenue,
    AVG(CASE WHEN i.status = 'paid' THEN i.total ELSE NULL END) AS avg_invoice_value,
    MIN(i.total) AS min_invoice_value,
    MAX(i.total) AS max_invoice_value
FROM invoices i
JOIN merchants m ON i.merchant_id = m.id
GROUP BY i.merchant_id, m.business_name;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get invoice with items
CREATE OR REPLACE FUNCTION get_invoice_with_items(p_invoice_id UUID)
RETURNS TABLE (
    invoice_id UUID,
    customer_id UUID,
    merchant_id UUID,
    status VARCHAR,
    payment_status VARCHAR,
    payment_method VARCHAR,
    subtotal NUMERIC,
    tax NUMERIC,
    total NUMERIC,
    items JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        i.customer_id,
        i.merchant_id,
        i.status,
        i.payment_status,
        i.payment_method,
        i.subtotal,
        i.tax,
        i.total,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', ii.id,
                    'productId', ii.product_id,
                    'productName', ii.product_name,
                    'quantity', ii.quantity,
                    'unitPrice', ii.unit_price,
                    'totalPrice', ii.total_price
                )
            ) FILTER (WHERE ii.id IS NOT NULL),
            '[]'::jsonb
        ) as items
    FROM invoices i
    LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
    WHERE i.id = p_invoice_id
    GROUP BY i.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invoice from cart
CREATE OR REPLACE FUNCTION create_invoice_from_cart(
    p_customer_id UUID,
    p_merchant_id UUID,
    p_items JSONB,
    p_subtotal NUMERIC,
    p_tax NUMERIC,
    p_total NUMERIC
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_item JSONB;
    v_user_context RECORD;
BEGIN
    -- Check permissions
    SELECT * INTO v_user_context FROM get_current_user_context();

    IF v_user_context.merchant_id IS DISTINCT FROM p_merchant_id AND v_user_context.user_type != 'system_admin' THEN
        RAISE EXCEPTION 'Permission denied: Cannot create invoice for merchant %', p_merchant_id;
    END IF;

    -- Create invoice
    INSERT INTO invoices (
        customer_id,
        merchant_id,
        subtotal,
        tax,
        total,
        status,
        payment_status,
        due_date
    ) VALUES (
        p_customer_id,
        p_merchant_id,
        p_subtotal,
        p_tax,
        p_total,
        'pending',
        'pending',
        NOW() + INTERVAL '24 hours'
    ) RETURNING id INTO v_invoice_id;

    -- Add invoice items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO invoice_items (
            invoice_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_invoice_id,
            (v_item->>'productId')::UUID,
            v_item->>'productName',
            (v_item->>'quantity')::INTEGER,
            (v_item->>'unitPrice')::NUMERIC,
            (v_item->>'totalPrice')::NUMERIC
        );
    END LOOP;

    -- Log the creation
    INSERT INTO audit_logs (
        merchant_id,
        user_id,
        action,
        entity_type,
        entity_id,
        new_values
    ) VALUES (
        p_merchant_id,
        v_user_context.current_user_id,
        'create_invoice',
        'invoices',
        v_invoice_id,
        jsonb_build_object(
            'customer_id', p_customer_id,
            'total', p_total,
            'items_count', jsonb_array_length(p_items)
        )
    );

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE invoices IS 'Customer invoices with payment tracking and Pi Network integration';
COMMENT ON TABLE invoice_items IS 'Line items for customer invoices with historical pricing';
COMMENT ON TABLE pos_terminals IS 'Point of sale terminals for merchant checkout locations';

COMMENT ON COLUMN invoices.subtotal IS 'Invoice subtotal before tax (Pi Network 7-decimal precision)';
COMMENT ON COLUMN invoices.tax IS 'Tax amount (Pi Network 7-decimal precision)';
COMMENT ON COLUMN invoices.total IS 'Invoice total including tax (Pi Network 7-decimal precision)';
COMMENT ON COLUMN invoices.pi_payment_id IS 'Pi Network payment identifier';
COMMENT ON COLUMN invoices.pi_transaction_id IS 'Pi Network blockchain transaction ID';

COMMENT ON FUNCTION get_invoice_with_items IS 'Retrieve invoice with all line items';
COMMENT ON FUNCTION create_invoice_from_cart IS 'Create new invoice from shopping cart data';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================