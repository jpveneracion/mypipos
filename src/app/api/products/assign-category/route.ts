import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/products/assign-category
 * Manually assign category to a product
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, category_name } = body;

    if (!product_id || !category_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_id and category_name are required'
        },
        { status: 400 }
      );
    }

    // Get category ID
    const categoryResult = await query(
      'SELECT id FROM universal_categories WHERE name = $1',
      [category_name]
    );

    if (categoryResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found',
          available_categories: await query('SELECT name FROM universal_categories ORDER BY name')
        },
        { status: 404 }
      );
    }

    const categoryId = categoryResult.rows[0].id;

    // Update product
    const result = await query(
      `UPDATE products
       SET universal_category_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, universal_sku`,
      [categoryId, product_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Category "${category_name}" assigned to product "${result.rows[0].name}"`,
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Category assignment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to assign category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/products/assign-category
 * Get products without categories
 */
export async function GET() {
  try {
    const result = await query(
      `SELECT
        p.id,
        p.name,
        p.universal_sku,
        p.barcode,
        mp.merchant_id
      FROM products p
      LEFT JOIN merchant_products mp ON p.id = mp.product_id
      WHERE p.universal_category_id IS NULL
        AND p.deleted_at IS NULL
      LIMIT 50`
    );

    return NextResponse.json({
      success: true,
      products: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Fetch uncategorized products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch uncategorized products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}