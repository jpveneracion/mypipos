-- Add attribution tracking to merchant_products table
-- This tracks who added each product to their merchant's catalog

-- Add created_by field to merchant_products table
ALTER TABLE merchant_products
ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for querying merchant products by creator
CREATE INDEX idx_merchant_products_created_by ON merchant_products(created_by) WHERE created_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN merchant_products.created_by IS 'User who added this product to the merchant catalog - tracks who brought each universal product to which merchant';

-- Create a view to show which users are most active in adding products to their merchant catalogs
CREATE VIEW merchant_catalog_contributors AS
SELECT
    u.id as user_id,
    u.username,
    u.pi_username,
    m.business_name,
    COUNT(mp.id) as products_added_to_catalog,
    MIN(mp.created_at) as first_addition,
    MAX(mp.created_at) as latest_addition
FROM users u
INNER JOIN merchant_products mp ON u.id = mp.created_by
INNER JOIN merchants m ON mp.merchant_id = m.id
WHERE mp.deleted_at IS NULL
GROUP BY u.id, u.username, u.pi_username, m.business_name
ORDER BY products_added_to_catalog DESC;