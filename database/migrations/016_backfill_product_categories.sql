-- ============================================================================
-- Migration 016: Backfill categories for existing products
-- ============================================================================
-- This migration assigns categories to products that were created without
-- categories (when the category system wasn't working yet)
-- ============================================================================

BEGIN;

-- Update products without categories based on name and description pattern matching
-- This checks both name and description fields for better matching

-- Confectionery (check this first since chocolate/candy are common keywords)
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Confectionery' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%candy%' OR
    LOWER(p.name) LIKE '%chocolate%' OR
    LOWER(p.name) LIKE '%choc%' OR
    LOWER(p.name) LIKE '%sweet%' OR
    LOWER(p.name) LIKE '%lollipop%' OR
    LOWER(p.name) LIKE '%bar%' OR
    LOWER(p.description) LIKE '%chocolate%' OR
    LOWER(p.description) LIKE '%candy%' OR
    LOWER(p.description) LIKE '%confectionery%'
);

-- Beverages
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Beverages' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%coffee%' OR
    LOWER(p.name) LIKE '%tea%' OR
    LOWER(p.name) LIKE '%water%' OR
    LOWER(p.name) LIKE '%juice%' OR
    LOWER(p.name) LIKE '%soda%' OR
    LOWER(p.name) LIKE '%coke%' OR
    LOWER(p.name) LIKE '%pepsi%' OR
    LOWER(p.name) LIKE '%drink%' OR
    LOWER(p.name) LIKE '%beverage%' OR
    LOWER(p.description) LIKE '%coffee%' OR
    LOWER(p.description) LIKE '%beverage%'
);

-- Snacks
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Snacks' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%chip%' OR
    LOWER(p.name) LIKE '%cracker%' OR
    LOWER(p.name) LIKE '%cookie%' OR
    LOWER(p.name) LIKE '%snack%' OR
    LOWER(p.description) LIKE '%snack%'
);

-- Dairy
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Dairy' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%milk%' OR
    LOWER(p.name) LIKE '%cheese%' OR
    LOWER(p.name) LIKE '%yogurt%' OR
    LOWER(p.name) LIKE '%dairy%' OR
    LOWER(p.description) LIKE '%dairy%'
);

-- Bakery
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Bakery' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%cake%' OR
    LOWER(p.name) LIKE '%pastry%' OR
    LOWER(p.name) LIKE '%bun%' OR
    LOWER(p.name) LIKE '%bakery%' OR
    LOWER(p.description) LIKE '%bakery%'
);

-- Frozen
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Frozen' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%frozen%' OR
    LOWER(p.name) LIKE '%ice cream%' OR
    LOWER(p.description) LIKE '%frozen%'
);

-- Condiments
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Condiments' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%sauce%' OR
    LOWER(p.name) LIKE '%ketchup%' OR
    LOWER(p.name) LIKE '%mayonnaise%' OR
    LOWER(p.name) LIKE '%condiment%' OR
    LOWER(p.name) LIKE '%seasoning%' OR
    LOWER(p.description) LIKE '%sauce%'
);

-- Food
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Food' LIMIT 1
)
WHERE universal_category_id IS NULL
AND (
    LOWER(p.name) LIKE '%sandwich%' OR
    LOWER(p.name) LIKE '%bread%' OR
    LOWER(p.name) LIKE '%rice%' OR
    LOWER(p.name) LIKE '%meal%' OR
    LOWER(p.name) LIKE '%food%' OR
    LOWER(p.description) LIKE '%food%'
);

-- For any remaining products without categories, assign to 'Food' as default
UPDATE products p
SET universal_category_id = (
    SELECT id FROM universal_categories WHERE name = 'Food' LIMIT 1
)
WHERE universal_category_id IS NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show how many products were assigned to each category
SELECT
    uc.name as category_name,
    COUNT(p.id) as product_count
FROM universal_categories uc
LEFT JOIN products p ON uc.id = p.universal_category_id
GROUP BY uc.id, uc.name
ORDER BY product_count DESC;

-- Check for any products still without categories
SELECT
    id,
    name,
    universal_sku
FROM products
WHERE universal_category_id IS NULL
LIMIT 10;