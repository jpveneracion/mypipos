-- Add attribution tracking to universal products table
-- This tracks who originally created each product in the shared catalog

-- Add created_by field to products table
ALTER TABLE products
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for querying products by creator
CREATE INDEX idx_products_created_by ON products(created_by) WHERE created_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN products.created_by IS 'User who originally created this universal product - used for rewards calculation when other merchants use their product';

-- Create a view to show product creators and their impact
CREATE VIEW product_creators_impact AS
SELECT
    u.id as user_id,
    u.username,
    u.pi_username,
    COUNT(p.id) as universal_products_created,
    COUNT(DISTINCT mp.merchant_id) as merchants_using_products,
    COUNT(mp.id) as total_merchant_additions,
    MIN(p.created_at) as first_product_created,
    MAX(p.created_at) as latest_product_created
FROM users u
INNER JOIN products p ON u.id = p.created_by
LEFT JOIN merchant_products mp ON p.id = mp.product_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.pi_username
ORDER BY universal_products_created DESC;

-- Create a view to show which products are most popular across merchants
CREATE VIEW popular_universal_products AS
SELECT
    p.id as product_id,
    p.name,
    p.barcode,
    p.universal_sku,
    u.username as created_by_username,
    u.pi_username as created_by_pi_username,
    COUNT(DISTINCT mp.merchant_id) as merchant_count,
    COUNT(mp.id) as total_additions,
    AVG(mp.price) as avg_price_across_merchants,
    MIN(mp.price) as min_price,
    MAX(mp.price) as max_price,
    p.created_at
FROM products p
LEFT JOIN users u ON p.created_by = u.id
LEFT JOIN merchant_products mp ON p.id = mp.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.barcode, p.universal_sku, u.username, u.pi_username, p.created_at
ORDER BY merchant_count DESC, total_additions DESC;