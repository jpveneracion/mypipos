-- ============================================================================
-- UPDATE PRICE PRECISION FOR PI MICRO-TRANSACTIONS (WITH DEPENDENCY HANDLING)
-- ============================================================================
-- This migration updates price columns to support 7 decimal places
-- to match Pi Network's micro-transaction capabilities.
-- Handles views and rules that depend on these columns.
-- ============================================================================

BEGIN;

-- First, let's identify and drop any views that depend on these columns
DO $$
DECLARE
    view_name TEXT;
    view_def TEXT;
BEGIN
    -- Drop views that might reference merchant_products price columns
    FOR view_name IN
        (SELECT viewname FROM pg_views WHERE viewname LIKE '%merchant_products%' OR viewname LIKE '%product%')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_name || ' CASCADE;';
    END LOOP;

    -- Drop views that might reference invoice_items price columns
    FOR view_name IN
        (SELECT viewname FROM pg_views WHERE viewname LIKE '%invoice_items%' OR viewname LIKE '%invoice%')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_name || ' CASCADE;';
    END LOOP;

END $$;

-- Drop any rules that might depend on these columns
DO $$
DECLARE
    rule_name TEXT;
BEGIN
    -- Drop rules on merchant_products
    FOR rule_name IN
        (SELECT rulename FROM pg_rules WHERE tablename = 'merchant_products')
    LOOP
        EXECUTE 'DROP RULE IF EXISTS ' || rule_name || ' ON merchant_products CASCADE;';
    END LOOP;

    -- Drop rules on invoice_items
    FOR rule_name IN
        (SELECT rulename FROM pg_rules WHERE tablename = 'invoice_items')
    LOOP
        EXECUTE 'DROP RULE IF EXISTS ' || rule_name || ' ON invoice_items CASCADE;';
    END LOOP;

END $$;

-- Now update the column types
ALTER TABLE merchant_products
    ALTER COLUMN price TYPE DECIMAL(10,7),
    ALTER COLUMN cost TYPE DECIMAL(10,7),
    ALTER COLUMN compare_at_price TYPE DECIMAL(10,7);

ALTER TABLE invoice_items
    ALTER COLUMN unit_price TYPE DECIMAL(10,7),
    ALTER COLUMN total_price TYPE DECIMAL(10,7);

-- Update POS transaction pricing if the table exists
DO $$
BEGIN
    -- Check if pos_transactions table exists and has pricing columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_transactions') THEN
        -- Check if it has pricing columns
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

-- Recreate any necessary views/rules with updated types
-- (Add back any views that your application needs, with the new DECIMAL(10,7) types)

-- Add comments to document the precision change
COMMENT ON COLUMN merchant_products.price IS 'Merchant-specific selling price (supports up to 7 decimal places for Pi micro-transactions)';
COMMENT ON COLUMN merchant_products.cost IS 'Merchant cost basis (supports up to 7 decimal places)';
COMMENT ON COLUMN merchant_products.compare_at_price IS 'Price comparison value (supports up to 7 decimal places)';
COMMENT ON COLUMN invoice_items.unit_price IS 'Unit price per item (supports up to 7 decimal places for micro-transactions)';
COMMENT ON COLUMN invoice_items.total_price IS 'Total line item price (supports up to 7 decimal places for micro-transactions)';

COMMIT;
