import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Get Customer Invoices API
 * GET /api/customers/[username]/invoices
 *
 * Fetches all sales for a customer and formats them as invoices
 * THIS IS WHERE ITEMS COME FROM THE DATABASE
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // optional: 'pending', 'paid', 'failed'

    // Step 1: Get customer by username
    const customer = await db.users.findFirst({
      where: { username }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Step 2: Use SECURITY DEFINER function to get customer invoices
    // **THIS IS MORE EFFICIENT** - Single query with joins
    const invoices = await db.query(
      'SELECT * FROM get_customer_invoices($1, $2, $3)',
      [customer.id, limit, status || null]
    );

    // Step 3: Get items for each invoice using SECURITY DEFINER function
    const invoicesWithItems = await Promise.all(
      invoices.map(async (invoice: any) => {
        const items = await db.query(
          'SELECT * FROM get_invoice_items($1)',
          [invoice.sale_id]
        );

        return {
          ...invoice,
          items: items.map((item: any) => ({
            id: item.item_id,
            invoiceId: invoice.invoice_id,
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            taxAmount: parseFloat(item.tax_amount),
            totalPrice: parseFloat(item.total_price),
            sku: item.sku
          }))
        };
      })
    );

    return NextResponse.json({
      success: true,
      invoices: invoicesWithItems,
      count: invoicesWithItems.length,
      customer: {
        id: customer.id,
        username: customer.username,
        name: customer.username
      }
    });

  } catch (error) {
    console.error('Customer invoices GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customer invoices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}