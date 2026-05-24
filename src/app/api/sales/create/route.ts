/**
 * Create Sale API Endpoint
 * POST /api/sales/create
 *
 * Creates a sale record with items from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { cartItems, customer, merchantId, transactionNumber } = await request.json();

    // Calculate totals
    const subtotal = cartItems.reduce((sum: number, item: any) =>
      sum + (item.price * item.quantity), 0
    );
    const taxRate = 0.08; // 8% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Create sale record
    const sale = await db.sales.create({
      data: {
        transaction_number: transactionNumber,
        merchant_id: merchantId,
        customer_id: customer.id,
        subtotal,
        tax_amount: tax,
        total_amount: total,
        payment_method: 'pi',
        payment_status: 'pending',
        u2a_payment_type: 'customer_purchase',
        u2a_payment_status: 'pending',
        status: 'pending'
      }
    });

    // **THIS IS THE KEY PART** - Create sale items from cart items
    for (const item of cartItems) {
      await db.sale_items.create({
        data: {
          sale_id: sale.id,
          merchant_id: merchantId,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          tax_amount: (item.price * item.quantity) * taxRate,
          total_price: (item.price * item.quantity) * (1 + taxRate),
          metadata: {
            cart_item_data: item
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      sale: {
        id: sale.id,
        transactionNumber: sale.transaction_number,
        itemCount: cartItems.length
      }
    });

  } catch (error) {
    console.error('Sale creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}