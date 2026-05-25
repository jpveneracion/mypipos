-- Create a proper universal categories system
-- This allows shared categories across all merchants while still allowing per-merchant customization

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create universal categories table
CREATE TABLE IF NOT EXISTS universal_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name for UI
    color VARCHAR(20), -- Hex color for UI
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on universal_categories table
ALTER TABLE universal_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for universal_categories (following migration 004 pattern)
-- All users can read categories (shared catalog)
CREATE POLICY universal_categories_select_policy ON universal_categories
    FOR SELECT
    TO mypipos_app
    USING (is_active = true);

-- All users can create categories if they don't exist
CREATE POLICY universal_categories_insert_policy ON universal_categories
    FOR INSERT
    TO mypipos_app
    WITH CHECK (true);

-- System admins can update/delete categories
CREATE POLICY universal_categories_manage_policy ON universal_categories
    FOR UPDATE
    TO mypipos_app
    USING (true)
    WITH CHECK (true);

CREATE POLICY universal_categories_delete_policy ON universal_categories
    FOR DELETE
    TO mypipos_app
    USING (false);

-- Security definer function to create categories (following migration 004 pattern)
CREATE OR REPLACE FUNCTION create_category_if_not_exists(
    p_name VARCHAR(100),
    p_slug VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_icon VARCHAR(50) DEFAULT NULL,
    p_color VARCHAR(20) DEFAULT NULL
) RETURNS universal_categories
SET search_path = public
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO universal_categories (name, slug, description, icon, color, display_order)
  VALUES (
    p_name,
    p_slug,
    p_description,
    p_icon,
    p_color,
    (SELECT COALESCE(MAX(display_order), 0) + 1 FROM universal_categories)
  )
  ON CONFLICT (name) DO UPDATE SET
    name = EXCLUDED.name
  RETURNING *;
$$;

-- Insert some common categories
INSERT INTO universal_categories (name, slug, description, icon, color, display_order) VALUES
('Beverages', 'beverages', 'Drinks and liquids', 'Coffee', '#0369a1', 1),
('Food', 'food', 'Prepared food items', 'Sandwich', '#ea580c', 2),
('Snacks', 'snacks', 'Packaged snacks and chips', 'Cookie', '#ca8a04', 3),
('Condiments', 'condiments', 'Sauces and seasonings', 'Package', '#16a34a', 4),
('Confectionery', 'confectionery', 'Candy and sweets', 'CircleDollarSign', '#db2777', 5),
('Dairy', 'dairy', 'Milk and dairy products', 'Package', '#0891b2', 6),
('Bakery', 'bakery', 'Bread and baked goods', 'Wheat', '#d97706', 7),
('Frozen', 'frozen', 'Frozen foods', 'Snowflake', '#0ea5e9', 8)
ON CONFLICT (name) DO NOTHING;

-- Add category_id to products table (references universal categories)
ALTER TABLE products
ADD COLUMN universal_category_id UUID REFERENCES universal_categories(id) ON DELETE SET NULL;

-- Create index for filtering by category
CREATE INDEX idx_products_universal_category_id ON products(universal_category_id) WHERE universal_category_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN products.universal_category_id IS 'Reference to universal category - better than category_name for consistency';

-- Add comment for the security function
COMMENT ON FUNCTION create_category_if_not_exists IS 'Security definer function that allows authenticated users to create categories if they don''t exist - enables merchant-driven category expansion while maintaining RLS';

-- Create a view to browse products by category
CREATE VIEW products_by_category AS
SELECT
    uc.name as category_name,
    uc.slug as category_slug,
    uc.icon as category_icon,
    uc.color as category_color,
    COUNT(DISTINCT mp.merchant_id) as merchant_count,
    COUNT(mp.id) as total_product_listings,
    AVG(mp.price) as avg_price_across_merchants
FROM universal_categories uc
LEFT JOIN products p ON uc.id = p.universal_category_id
LEFT JOIN merchant_products mp ON p.id = mp.product_id
WHERE uc.is_active = true
  AND p.deleted_at IS NULL
GROUP BY uc.id, uc.name, uc.slug, uc.icon, uc.color, uc.display_order
ORDER BY uc.display_order;

-- Grant execute permission on the security function to the database user role
GRANT EXECUTE ON FUNCTION create_category_if_not_exists TO mypipos_app;

-- Grant permissions on universal_categories table to mypipos_app
GRANT SELECT, INSERT, UPDATE ON universal_categories TO mypipos_app;

-- Grant usage on the products_by_category view
GRANT SELECT ON products_by_category TO mypipos_app;