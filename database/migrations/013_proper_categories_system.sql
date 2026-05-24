-- Create a proper universal categories system
-- This allows shared categories across all merchants while still allowing per-merchant customization

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