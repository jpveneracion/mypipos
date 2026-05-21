import { NextRequest, NextResponse } from 'next/server';

// Mock data for development
let mockSales = [
  {
    id: '123e4567-e89b-12d3-a456-426614174100',
    merchant_id: '123e4567-e89b-12d3-a456-426614174000',
    customer_pi_id: 'customer_123',
    items: [
      {
        product_id: '123e4567-e89b-12d3-a456-426614174000',
        product_name: 'Heinz Tomato Ketchup',
        quantity: 2,
        unit_price: 3.99,
        subtotal: 7.98
      }
    ],
    subtotal: 7.98,
    tax: 0.64,
    total: 8.62,
    payment_method: 'pi_network',
    payment_status: 'completed',
    sale_date: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchant_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let filteredSales = [...mockSales];

    if (merchantId) {
      filteredSales = filteredSales.filter(s => s.merchant_id === merchantId);
    }

    // Sort by date (newest first) and limit
    filteredSales.sort((a, b) =>
      new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
    );
    filteredSales = filteredSales.slice(0, limit);

    return NextResponse.json({
      success: true,
      sales: filteredSales,
      count: filteredSales.length
    });
  } catch (error) {
    console.error('Sales GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sales'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchant_id, customer_pi_id, items, payment_method } = body;

    // Validate required fields
    if (!merchant_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields'
        },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;

    // Create sale record
    const newSale = {
      id: crypto.randomUUID(),
      merchant_id,
      customer_pi_id: customer_pi_id || null,
      items: items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price
      })),
      subtotal,
      tax,
      total,
      payment_method: payment_method || 'pi_network',
      payment_status: 'completed',
      sale_date: new Date().toISOString()
    };

    mockSales.unshift(newSale);

    return NextResponse.json({
      success: true,
      sale: newSale,
      message: 'Sale completed successfully'
    });
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create sale'
      },
      { status: 500 }
    );
  }
}