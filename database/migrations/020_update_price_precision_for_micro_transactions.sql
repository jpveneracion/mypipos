-- ============================================================================
-- UPDATE PRICE PRECISION FOR PI MICRO-TRANSACTIONS
-- ============================================================================
-- This migration updates price columns to support 7 decimal places
-- to match Pi Network's micro-transaction capabilities.
-- Prices like 0.0000007 Pi should now be supported.
-- ============================================================================

BEGIN;

-- Update merchant_products price column to support 7 decimal places
ALTER TABLE merchant_products
    ALTER COLUMN price TYPE DECIMAL(10,7),
    ALTER COLUMN cost TYPE DECIMAL(10,7),
    ALTER COLUMN compare_at_price TYPE DECIMAL(10,7);

-- Update invoice items pricing to support 7 decimal places
ALTER TABLE invoice_items
    ALTER COLUMN unit_price TYPE DECIMAL(10,7),
    ALTER COLUMN total_price TYPE DECIMAL(10,7);

-- Update POS transaction pricing if the table exists
DO $$
BEGIN
    -- Check if pos_transactions table exists and has pricing columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_transactions') THEN
        -- Check if it has the deprecated pricing columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'unit_price') THEN
            ALTER TABLE pos_transactions
                ALTER COLUMN unit_price TYPE DECIMAL(10,7);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'total_price') THEN
            ALTER TABLE pos_transactions
                ALTER COLUMN total_price TYPE DECIMAL(10,7);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'subtotal') THEN
            ALTER TABLE pos_transactions
                ALTER COLUMN subtotal TYPE DECIMAL(10,7);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_transactions' AND column_name = 'tax_amount') THEN
            ALTER TABLE pos_transactions
                ALTER COLUMN tax_amount TYPE DECIMAL(10,7);
        END IF;
    END IF;
END $$;

-- Add comments to document the precision change
COMMENT ON COLUMN merchant_products.price IS 'Merchant-specific selling price (supports up to 7 decimal places for Pi micro-transactions)';
COMMENT ON COLUMN merchant_products.cost IS 'Merchant cost basis (supports up to 7 decimal places)';
COMMENT ON COLUMN merchant_products.compare_at_price IS 'Price comparison value (supports up to 7 decimal places)';
COMMENT ON COLUMN invoice_items.unit_price IS 'Unit price per item (supports up to 7 decimal places for micro-transactions)';
COMMENT ON COLUMN invoice_items.total_price IS 'Total line item price (supports up to 7 decimal places for micro-transactions)';

COMMIT;
