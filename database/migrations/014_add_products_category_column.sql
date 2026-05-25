-- ============================================================================
-- Migration 014: Add universal_category_id to products table
-- ============================================================================
-- This migration completes the partially executed migration 013
-- Adds the missing universal_category_id column to products table
-- ============================================================================

BEGIN;

-- Check if column exists before adding (for idempotency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'universal_category_id'
    ) THEN
        ALTER TABLE products
        ADD COLUMN universal_category_id UUID REFERENCES universal_categories(id) ON DELETE SET NULL;

        -- Create index for filtering by category
        CREATE INDEX idx_products_universal_category_id
        ON products(universal_category_id)
        WHERE universal_category_id IS NOT NULL;

        RAISE NOTICE 'Added universal_category_id column to products table';
    ELSE
        RAISE NOTICE 'universal_category_id column already exists in products table';
    END IF;
END
$$;

-- Add comment
COMMENT ON COLUMN products.universal_category_id IS 'Reference to universal category - better than category_name for consistency';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that the column exists
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'products'
AND column_name = 'universal_category_id';

-- Check that the index exists
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'products'
AND indexname = 'idx_products_universal_category_id';