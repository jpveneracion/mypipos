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

    // Check if category already exists
    const existing = await query(
      'SELECT id, name FROM universal_categories WHERE name = $1 OR slug = $2',
      [name, slug]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: true,
        category: existing.rows[0],
        message: 'Category already exists'
      });
    }

    // Get next display order
    const orderResult = await query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM universal_categories'
    );

    // Create new category
    const result = await query(
      `INSERT INTO universal_categories (name, slug, description, icon, color, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        slug,
        description || null,
        icon || null,
        color || null,
        orderResult.rows[0].next_order
      ]
    );

    return NextResponse.json({
      success: true,
      category: result.rows[0],
      message: 'Category created successfully'
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
