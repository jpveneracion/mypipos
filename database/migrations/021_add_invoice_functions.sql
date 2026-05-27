-- ============================================================================
-- Migration 021: Add Missing Invoice Functions
-- ============================================================================
-- This migration creates the missing get_customer_invoices and get_invoice_items
-- functions that are required by the customer invoices API but were not
-- created in previous migrations.
-- ============================================================================

-- Function to get customer invoices (sales + items)
CREATE OR REPLACE FUNCTION get_customer_invoices(
    p_customer_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_payment_status VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    invoice_id VARCHAR(100),
    sale_id UUID,
    customer_id UUID,
    merchant_id UUID,
    merchant_name VARCHAR(255),
    transaction_number VARCHAR(100),
    subtotal DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2),
    payment_status VARCHAR(20),
    pi_payment_id VARCHAR(255),
    pi_transaction_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    item_count INTEGER
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        s.transaction_number as invoice_id,
        s.id as sale_id,
        s.customer_id,
        s.merchant_id,
        m.business_name as merchant_name,
        s.transaction_number,
        s.subtotal,
        s.tax_amount,
        s.total_amount,
        s.payment_status,
        s.pi_payment_id,
        s.pi_transaction_id,
        s.created_at,
        s.updated_at,
        NULL::timestamp as due_date,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
    FROM sales s
    JOIN merchants m ON s.merchant_id = m.id
    WHERE s.customer_id = p_customer_id
      AND (p_payment_status IS NULL OR s.payment_status = p_payment_status)
    ORDER BY s.created_at DESC
    LIMIT p_limit;
$$;

-- Function to get invoice items (sale items for a specific sale)
CREATE OR REPLACE FUNCTION get_invoice_items(p_sale_id UUID)
RETURNS TABLE (
    item_id UUID,
    product_id UUID,
    product_name VARCHAR(255),
    quantity INTEGER,
    unit_price DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total_price DECIMAL(10,2),
    sku VARCHAR(100)
)
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT
        si.id as item_id,
        si.product_id,
        si.product_name,
        si.quantity,
        si.unit_price,
        si.tax_amount,
        si.total_price,
        COALESCE(si.universal_sku, si.merchant_sku) as sku
    FROM sale_items si
    WHERE si.sale_id = p_sale_id
    ORDER BY si.created_at ASC;
$$;

-- Grant execute permissions to mypipos_app role
GRANT EXECUTE ON FUNCTION get_customer_invoices(UUID, INTEGER, VARCHAR(50)) TO mypipos_app;
GRANT EXECUTE ON FUNCTION get_invoice_items(UUID) TO mypipos_app;

-- ============================================================================
-- Migration complete
-- ============================================================================