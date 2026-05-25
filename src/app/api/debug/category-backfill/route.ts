import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check if universal_categories has data
    const categoriesResult = await query(`
      SELECT id, name, slug FROM universal_categories ORDER BY name;
    `);

    // Check if the specific product exists and its current state
    const productResult = await query(`
      SELECT
        id,
        name,
        description,
        universal_sku,
        universal_category_id
      FROM products
      WHERE name LIKE '%Choc%'
      LIMIT 5;
    `);

    // Test the pattern matching manually
    const patternTest = await query(`
      SELECT
        id,
        name,
        description,
        CASE
          WHEN LOWER(name) LIKE '%choc%' THEN 'Matches %choc%'
          WHEN LOWER(name) LIKE '%chocolate%' THEN 'Matches %chocolate%'
          WHEN LOWER(description) LIKE '%chocolate%' THEN 'Description has chocolate'
          ELSE 'No match'
        END as pattern_match,
        universal_category_id,
        (SELECT id FROM universal_categories WHERE name = 'Confectionery' LIMIT 1) as target_category_id
      FROM products
      WHERE name LIKE '%Choc%' OR description LIKE '%chocolate%'
      LIMIT 5;
    `);

    // Count products by category status
    const categoryStatus = await query(`
      SELECT
        COUNT(*) as total_products,
        COUNT(universal_category_id) as with_category,
        COUNT(*) - COUNT(universal_category_id) as without_category
      FROM products
      WHERE deleted_at IS NULL;
    `);

    return NextResponse.json({
      success: true,
      categories: {
        count: categoriesResult.rows.length,
        data: categoriesResult.rows
      },
      products: {
        total: categoryStatus.rows[0].total_products,
        with_category: categoryStatus.rows[0].with_category,
        without_category: categoryStatus.rows[0].without_category
      },
      chocolateProducts: productResult.rows,
      patternTest: patternTest.rows,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString(),
    }, { status: 500 });
  }
}