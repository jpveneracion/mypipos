import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    // First get the Confectionery category ID
    const categoryResult = await query(`
      SELECT id, name FROM universal_categories WHERE name = 'Confectionery';
    `);

    if (categoryResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Confectionery category not found in universal_categories table'
      });
    }

    const categoryId = categoryResult.rows[0].id;

    // Find products that should be in Confectionery
    const findResult = await query(`
      SELECT
        id,
        name,
        description,
        universal_category_id
      FROM products
      WHERE universal_category_id IS NULL
      AND (
        LOWER(name) LIKE '%choc%' OR
        LOWER(name) LIKE '%chocolate%' OR
        LOWER(description) LIKE '%chocolate%'
      )
    `);

    if (findResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matching products found - they might already be categorized',
        category_id: categoryId
      });
    }

    // Update the products
    let updatedCount = 0;
    for (const product of findResult.rows) {
      const updateResult = await query(`
        UPDATE products
        SET universal_category_id = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, universal_category_id
      `, [categoryId, product.id]);

      if (updateResult.rows.length > 0) {
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} products to Confectionery category`,
      category_id: categoryId,
      products_found: findResult.rows.length,
      products_updated: updatedCount,
      updated_products: findResult.rows.map(p => ({
        id: p.id,
        name: p.name,
        old_category_id: p.universal_category_id,
        new_category_id: categoryId
      }))
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}