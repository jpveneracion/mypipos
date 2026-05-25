import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Test the exact pattern matching for the chocolate product
    const result = await query(`
      SELECT
        id,
        name,
        description,
        universal_category_id,
        LOWER(name) as name_lower,
        CASE
          WHEN LOWER(name) LIKE '%choc%' THEN '✓ Matches %choc%'
          ELSE '✗ No match'
        END as pattern_check,
        CASE
          WHEN universal_category_id IS NULL THEN 'Category is NULL'
          ELSE 'Has category'
        END as category_status
      FROM products
      WHERE id = 'bc14c9ee-8423-4795-bcb7-3ff7b2ac3ca7'
    `);

    return NextResponse.json({
      success: true,
      product: result.rows[0],
      confectionery_category_id: 'd921f0ce-33ab-4514-bdeb-d76281ec5d75'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}