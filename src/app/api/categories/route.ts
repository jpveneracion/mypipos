import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/categories
 * Get all available categories
 */
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT
        id,
        name,
        slug,
        description,
        icon,
        color,
        display_order
      FROM universal_categories
      WHERE is_active = true
      ORDER BY display_order, name`
    );

    return NextResponse.json({
      success: true,
      categories: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new category (for merchants who need custom categories like "Nails")
 * Uses security definer function to allow category creation within RLS constraints
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, icon, color } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category name is required'
        },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    // Use the security definer function to create category
    const result = await query(
      'SELECT create_category_if_not_exists($1, $2, $3, $4, $5) as category_id',
      [
        name,
        slug,
        description || null,
        icon || null,
        color || null
      ]
    );

    // Fetch the created/existing category
    const categoryResult = await query(
      'SELECT id, name, slug, description, icon, color, display_order FROM universal_categories WHERE id = $1',
      [result.rows[0].category_id]
    );

    return NextResponse.json({
      success: true,
      category: categoryResult.rows[0],
      message: categoryResult.rows[0].name === name
        ? 'Category created successfully'
        : 'Category already exists'
    });
  } catch (error) {
    console.error('Category creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
